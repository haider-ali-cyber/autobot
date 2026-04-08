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
        self.scan_interval = 15       # Quick scans for scalping
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
        logger.info("Trading engine scan loop started")
        from datetime import datetime
        _data_fail_streak = 0
        while self._running:
            try:
                self.last_scan = datetime.utcnow().isoformat()
                
                # Fetch Sentiment Status
                sentiment = news_fetcher.get_sentiment_summary()
                score = sentiment["score"]
                
                # Emergency Close: If sentiment goes extremely negative (Panic)
                if score < -0.7:
                    logger.warning(f"EMERGENCY: Extreme Negative Sentiment Detected ({score}). Closing all trades!")
                    order_manager.close_all_trades(reason='sentiment_panic')
                    time.sleep(60) # Pause for 1 minute
                    continue

                logger.info(f"Scanning {len(config.TRADING_PAIRS)} coins (Scalping Mode)... Market Sentiment: {sentiment['label']} ({sentiment['percentage']}%)")
                _got_data = 0

                for symbol in config.TRADING_PAIRS:
                    if not self._running:
                        break
                    analysis = self.analyze_coin(symbol)
                    if analysis:
                        _got_data += 1
                        if analysis['actionable']:
                            # Applying Sentiment Filter (as requested: >20% positive required for Buy)
                            sig_type = analysis['signal']['signal']
                            if sig_type == 'BUY' and score < 0.2:
                                logger.info(f"Skip BUY on {symbol}: News sentiment {score} is below 0.2 trigger.")
                                continue
                            
                            self.total_signals += 1
                            users = db_manager.get_all_active_users()
                            for user in users:
                                self.execute_signal(analysis, user)
                    time.sleep(0.5)  # Rate limit between coins

                if _got_data == 0:
                    _data_fail_streak += 1
                    if _data_fail_streak == 1:
                        logger.warning("No market data received (Bybit 403/rate-limit). Backing off 5 min.")
                    time.sleep(300)  # 5 min backoff when all coins fail
                    continue
                else:
                    _data_fail_streak = 0

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

    def get_status(self, user_id: Optional[int] = None) -> Dict:
        if user_id:
            stats = db_manager.get_stats(user_id)
        else:
            stats = {'open_trades': 0, 'total_trades': 0, 'win_rate': 0, 'total_pnl': 0, 'daily_pnl': 0}
        
        return {
            'status': self.status,
            'running': self._running,
            'paper_trading': config.PAPER_TRADING,
            'last_scan': self.last_scan,
            'total_signals': self.total_signals,
            'total_trades_opened': self.total_trades_opened,
            'open_trades': stats['open_trades'],
            'total_trades': stats['total_trades'],
            'win_rate': stats['win_rate'],
            'total_pnl': stats['total_pnl'],
            'daily_pnl': stats['daily_pnl'],
            'max_open_trades': config.MAX_OPEN_TRADES,
            'max_stop_loss': config.MAX_STOP_LOSS_USD,
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
