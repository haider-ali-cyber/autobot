import math
import threading
import time
from typing import Dict, List, Optional
from ..config import config
from ..utils.logger import logger
from ..exchange.data_fetcher import data_fetcher
from ..analysis.technical import full_analysis
from ..analysis.candle_patterns import detect_patterns
from ..trading.risk_manager import risk_manager
from ..trading.order_manager import order_manager
from ..database.db_manager import db_manager
from ..utils.news_fetcher import news_fetcher
from ..strategies.base_strategy import ALL_STRATEGIES, SignalType


class TradingEngine:
    """
    Main trading brain - scans all 20 coins, runs strategies,
    and executes trades automatically.
    """

    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock() # Lock for thread-safe access to stats/cache
        self.scan_interval = config.SCAN_INTERVAL 
        self.signals_cache: Dict[str, Dict] = {}
        self.status = "stopped"
        self.last_scan: Optional[str] = None
        self.total_signals = 0
        self.total_trades_opened = 0

    # ─────────────────── COIN ANALYSIS ───────────────────

    def analyze_coin(self, symbol: str) -> Optional[Dict]:
        try:
            candles = data_fetcher.get_historical_for_analysis(
                symbol, interval=config.PRIMARY_TIMEFRAME
            )
            if len(candles) < 40:
                return None

            indicators = full_analysis(candles)
            if not indicators:
                return None

            candle_result = detect_patterns(candles)

            best_signal = None
            best_strength = 0.0

            for strategy in ALL_STRATEGIES:
                signal = strategy.analyze(indicators, candle_result, symbol)
                if signal.is_actionable(config.SIGNAL_THRESHOLD):
                    if signal.strength > best_strength:
                        best_signal = signal
                        best_strength = signal.strength

            result = {
                'symbol': symbol,
                'indicators': indicators,
                'candle_result': candle_result,
                'signal': best_signal.to_dict() if best_signal else {
                    'signal': 'NEUTRAL', 'strength': 0.0,
                    'strategy': None, 'reasons': []
                },
                'actionable': best_signal is not None,
            }

            self.signals_cache[symbol] = result
            return result

        except Exception as e:
            logger.error(f"analyze_coin error {symbol}: {e}")
            return None

    # ─────────────────── TRADE EXECUTION ───────────────────

    def execute_signal(self, analysis: Dict, user) -> bool:
        symbol = analysis['symbol']
        signal_data = analysis['signal']
        indicators = analysis['indicators']

        if not analysis['actionable']:
            return False

        # Prevent duplicate trades on same symbol FOR THIS USER
        existing = db_manager.get_open_trade_by_symbol(user.id, symbol)
        if existing:
            return False

        side = 'Buy' if signal_data['signal'] == 'BUY' else 'Sell'
        entry_price = data_fetcher.get_price(symbol)
        if entry_price == 0:
            return False

        atr = indicators.get('atr', entry_price * 0.002)

        # Calculate SL/TP with $0.6 hard cap
        sl_tp = risk_manager.calculate_sl_tp(entry_price, side, atr)

        trade = order_manager.open_trade(
            user=user,
            symbol=symbol,
            side=side,
            entry_price=entry_price,
            stop_loss=sl_tp['stop_loss'],
            take_profit=sl_tp['take_profit'],
            strategy=signal_data.get('strategy', 'Unknown'),
            atr=atr,
        )

        if trade:
            self.total_trades_opened += 1
            logger.info(
                f"User {user.id} TRADE OPENED: {symbol} {side} @ {entry_price} | "
                f"SL={sl_tp['stop_loss']} TP={sl_tp['take_profit']} | "
                f"Strategy={signal_data.get('strategy')}"
            )
            # Signals are shared/global brain, but we log who acted on them
            db_manager.save_signal(
                symbol=symbol,
                signal_type=signal_data['signal'],
                strength=signal_data.get('strength', 0),
                strategy=signal_data.get('strategy', 'Unknown'),
                indicators=indicators,
                candle_pattern=signal_data.get('candle_pattern'),
                acted_on=True
            )
            return True
        return False

    # ─────────────────── MAIN SCAN LOOP ───────────────────

    def _scan_loop(self):
        logger.info(f"Trading engine high-frequency loop started ({self.scan_interval}s interval)")
        from datetime import datetime
        _data_fail_streak = 0
        
        while self._running:
            try:
                start_time = time.time()
                self.last_scan = datetime.utcnow().isoformat()
                
                # Global Sentiment Fetch (maybe slower, e.g. every 60s)
                # For high frequency, we might want to cache sentiment elsewhere
                sentiment = news_fetcher.get_sentiment_summary()
                score = sentiment["score"]
                
                # Fetch ALL prices in ONE call (Optimization)
                bulk_data = data_fetcher.get_all_tickers()
                if not bulk_data:
                    _data_fail_streak += 1
                    if _data_fail_streak % 50 == 0:
                        logger.warning("Market data fetch failing repeatedly.")
                    time.sleep(1)
                    continue

                _data_fail_streak = 0
                
                # Process each coin in bulk
                for coin_data in bulk_data:
                    symbol = coin_data['symbol']
                    analysis = self.analyze_coin(symbol)
                    
                    if analysis and analysis['actionable']:
                        with self._lock:
                            self.total_signals += 1
                        
                        # Apply Sentiment Filter
                        sig_type = analysis['signal']['signal']
                        if sig_type == 'BUY' and score < 0.2:
                            continue
                        
                        # EXECUTION: Iterate through users who have BOT ON
                        users = db_manager.get_all_active_users()
                        for user in users:
                            if user.is_bot_running:
                                self.execute_signal(analysis, user)

                # Calculate execution time to maintain precise interval
                elapsed = time.time() - start_time
                sleep_time = max(0.01, self.scan_interval - elapsed)
                time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"Scan loop error: {e}")

            time.sleep(self.scan_interval)

    # ─────────────────── CONTROLS ───────────────────

    def start(self):
        if not self._running:
            self._running = True
            self.status = "running"
            data_fetcher.start()
            order_manager.start_monitor()
            self._thread = threading.Thread(
                target=self._scan_loop, daemon=True
            )
            self._thread.start()
            logger.info("Trading engine STARTED")

    def stop(self):
        self._running = False
        self.status = "stopped"
        order_manager.stop_monitor()
        data_fetcher.stop()
        if self._thread:
            self._thread.join(timeout=10)
        logger.info("Trading engine STOPPED")

    def get_status(self, user_id: str) -> dict:
        """Returns bot status and user-specific stats."""
        user = db_manager.get_user_by_id(user_id)
        stats = db_manager.get_stats(user_id)
        
        return {
            'running': user.is_bot_running if user else False,
            'status': "RUNNING" if self._running else "GLOBAL_STOPPED",
            'last_scan': self.last_scan,
            'total_signals': self.total_signals,
            'total_trades': stats.get('total_trades', 0),
            'total_pnl': stats.get('total_pnl', 0),
            'daily_pnl': stats.get('daily_pnl', 0),
            'win_rate': stats.get('win_rate', 0),
            'paper_trading': config.PAPER_TRADING
        }

    @staticmethod
    def _safe(v, default=0):
        if v is None:
            return default
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return default
        return v

    def get_signals_cache(self) -> List[Dict]:
        s = self._safe
        result = []
        for symbol, data in self.signals_cache.items():
            result.append({
                'symbol': symbol,
                'signal': data['signal']['signal'],
                'strength': s(data['signal'].get('strength', 0)),
                'strategy': data['signal'].get('strategy'),
                'rsi': s(data['indicators'].get('rsi', 0)),
                'trend': data['indicators'].get('trend', '') or '',
                'macd': s(data['indicators'].get('macd', 0)),
                'bb_position': s(data['indicators'].get('bb_position', 0)),
                'candle_pattern': data['candle_result'].get('top_pattern'),
            })
        return result


trading_engine = TradingEngine()
