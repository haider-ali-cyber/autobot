import asyncio
import json
import threading
from typing import Dict, List, Callable, Optional
import requests
from ..config import config
from ..utils.logger import logger
from .bybit_client import BybitClient


class DataFetcher:
    def __init__(self):
        self.prices: Dict[str, float] = {}
        self.tickers: Dict[str, Dict] = {}
        self._callbacks: List[Callable] = []
        self._running = False
        self._thread: Optional[threading.Thread] = None
        # Use config for domain/demo even for public data to avoid region blocks
        self._client = BybitClient(
            paper_trading=True, 
            testnet=config.BYBIT_TESTNET,
            demo=config.BYBIT_DEMO,
            base_url=config.BYBIT_DOMAIN
        )

    def register_callback(self, cb: Callable):
        self._callbacks.append(cb)

    def _notify(self, data: dict):
        for cb in self._callbacks:
            try:
                cb(data)
            except Exception as e:
                logger.error(f"DataFetcher callback error: {e}")

    # ─────────────────── HISTORICAL DATA ───────────────────
    _BINANCE_INTERVAL = {'5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1d'}

    _ohlcv_cache: Dict = {}
    _OHLCV_CACHE_TTL = 300  # 5 minutes
    _CG_INTERVAL_DAYS = {'5': 1, '15': 1, '60': 7, '240': 30, 'D': 365}

    def get_ohlcv(self, symbol: str, interval: str = '15',
                  limit: int = 200, _cg_ok: bool = True) -> List[Dict]:
        candles = self._client.get_klines(symbol, interval, limit)
        if candles:
            return candles
        # Bybit failed - try Binance
        candles = self._get_ohlcv_binance(symbol, interval, limit)
        if candles:
            return candles
        # Binance failed - try CoinGecko (only for primary intervals, not multi-tf)
        if _cg_ok:
            return self._get_ohlcv_coingecko(symbol, interval)
        return []

    def _get_ohlcv_binance(self, symbol: str, interval: str,
                            limit: int) -> List[Dict]:
        """Fallback to Binance public klines API."""
        try:
            bi = self._BINANCE_INTERVAL.get(interval, '15m')
            resp = requests.get(
                'https://api.binance.com/api/v3/klines',
                params={'symbol': symbol, 'interval': bi, 'limit': limit},
                timeout=10
            )
            if resp.status_code != 200:
                return []
            raw = resp.json()
            candles = [{
                'time': int(c[0]) // 1000,
                'open': float(c[1]), 'high': float(c[2]),
                'low': float(c[3]), 'close': float(c[4]),
                'volume': float(c[5]),
            } for c in raw]
            return candles
        except Exception:
            return []

    def _get_ohlcv_coingecko(self, symbol: str, interval: str = '15') -> List[Dict]:
        """Fallback to CoinGecko OHLC API (no auth, no region block)."""
        import time as _time
        cg_id = self._COINGECKO_IDS.get(symbol)
        if not cg_id:
            return []
        days = self._CG_INTERVAL_DAYS.get(interval, 1)
        cache_key = (cg_id, days)
        cached = self._ohlcv_cache.get(cache_key)
        if cached:
            ts, data = cached
            if _time.time() - ts < self._OHLCV_CACHE_TTL:
                return data
        try:
            _time.sleep(1)  # respect CoinGecko free-tier rate limit
            resp = requests.get(
                f'https://api.coingecko.com/api/v3/coins/{cg_id}/ohlc',
                params={'vs_currency': 'usd', 'days': days},
                timeout=10
            )
            if resp.status_code != 200:
                return []
            raw = resp.json()
            candles = [{
                'time': int(c[0]) // 1000,
                'open': float(c[1]), 'high': float(c[2]),
                'low': float(c[3]), 'close': float(c[4]),
                'volume': 0.0,
            } for c in raw if len(c) >= 5]
            self._ohlcv_cache[cache_key] = (_time.time(), candles)
            return candles
        except Exception as e:
            logger.warning(f"CoinGecko OHLCV failed for {symbol}: {e}")
            return []

    def get_multi_timeframe(self, symbol: str) -> Dict[str, List[Dict]]:
        timeframes = ['5', '15', '60', '240', 'D']
        result = {}
        for tf in timeframes:
            candles = self.get_ohlcv(symbol, tf, limit=100, _cg_ok=False)
            if candles:
                result[tf] = candles
        return result

    def get_historical_for_analysis(self, symbol: str,
                                     interval: str = '15') -> List[Dict]:
        return self.get_ohlcv(symbol, interval, limit=500, _cg_ok=True)

    # ─────────────────── LIVE PRICES ───────────────────
    def fetch_all_prices(self) -> Dict[str, Dict]:
        tickers = self._client.get_all_tickers()
        result = {}
        for t in tickers:
            sym = t['symbol']
            self.prices[sym] = t['last_price']
            self.tickers[sym] = t
            result[sym] = t
        return result

    def get_all_tickers(self) -> Dict[str, Dict]:
        return self.fetch_all_prices()

    def get_price(self, symbol: str) -> float:
        return self.prices.get(symbol, 0.0)

    def get_ticker(self, symbol: str) -> Optional[Dict]:
        return self.tickers.get(symbol)

    # ─────────────────── COINGECKO FALLBACK ───────────────────
    _COINGECKO_IDS = {
        'BTCUSDT': 'bitcoin', 'ETHUSDT': 'ethereum', 'SOLUSDT': 'solana',
        'BNBUSDT': 'binancecoin', 'ADAUSDT': 'cardano', 'XRPUSDT': 'ripple',
        'DOGEUSDT': 'dogecoin', 'AVAXUSDT': 'avalanche-2', 'DOTUSDT': 'polkadot',
        'MATICUSDT': 'matic-network', 'LINKUSDT': 'chainlink', 'LTCUSDT': 'litecoin',
        'UNIUSDT': 'uniswap', 'ATOMUSDT': 'cosmos', 'NEARUSDT': 'near',
        'ALGOUSDT': 'algorand', 'APTUSDT': 'aptos', 'ARBUSDT': 'arbitrum',
        'OPUSDT': 'optimism', 'SUIUSDT': 'sui',
    }

    def fetch_prices_coingecko(self) -> Dict[str, Dict]:
        """Fallback price fetcher using CoinGecko public API (no auth needed)."""
        try:
            ids = ','.join(self._COINGECKO_IDS.values())
            resp = requests.get(
                'https://api.coingecko.com/api/v3/simple/price',
                params={'ids': ids, 'vs_currencies': 'usd',
                        'include_24hr_change': 'true'},
                timeout=10
            )
            if resp.status_code != 200:
                return {}
            data = resp.json()
            result = {}
            id_to_sym = {v: k for k, v in self._COINGECKO_IDS.items()}
            for cg_id, info in data.items():
                sym = id_to_sym.get(cg_id)
                if sym and 'usd' in info:
                    price = float(info['usd'])
                    change = float(info.get('usd_24h_change', 0) or 0)
                    ticker = {
                        'symbol': sym, 'last_price': price,
                        'bid': price, 'ask': price,
                        'change_24h': round(change, 2),
                        'volume_24h': 0, 'high_24h': price, 'low_24h': price,
                    }
                    self.prices[sym] = price
                    self.tickers[sym] = ticker
                    result[sym] = ticker
            if result:
                logger.info(f"CoinGecko fallback: fetched {len(result)} prices")
            return result
        except Exception as e:
            logger.warning(f"CoinGecko fallback failed: {e}")
            return {}

    # ─────────────────── FEAR & GREED INDEX ───────────────────
    def get_fear_greed_index(self) -> Dict:
        try:
            resp = requests.get(
                'https://api.alternative.me/fng/?limit=1', timeout=5
            )
            data = resp.json()
            item = data['data'][0]
            return {
                'value': int(item['value']),
                'label': item['value_classification'],
            }
        except Exception:
            return {'value': 50, 'label': 'Neutral'}

    # ─────────────────── POLLING LOOP ───────────────────
    def _poll_loop(self):
        import time
        logger.info("DataFetcher polling loop started")
        _fail_streak = 0
        while self._running:
            try:
                all_tickers = self.fetch_all_prices()
                if all_tickers:
                    _fail_streak = 0
                    self._notify({'type': 'prices', 'data': all_tickers})
                else:
                    _fail_streak += 1
                    if _fail_streak == 1:
                        logger.warning("Bybit prices unavailable (403). Trying CoinGecko fallback...")
                    # Try CoinGecko fallback
                    cg_data = self.fetch_prices_coingecko()
                    if cg_data:
                        _fail_streak = 0
                        self._notify({'type': 'prices', 'data': cg_data})
                        time.sleep(30)  # CoinGecko: poll every 30s
                        continue
                    else:
                        time.sleep(60)  # Both sources failed - back off 60s
                        continue
            except Exception as e:
                logger.error(f"Polling error: {e}")
            time.sleep(10)  # 10s between price polls to respect rate limits

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(
                target=self._poll_loop, daemon=True
            )
            self._thread.start()
            logger.info("DataFetcher started")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("DataFetcher stopped")


data_fetcher = DataFetcher()
