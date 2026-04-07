from typing import Optional, Dict, Any, List
from pybit.unified_trading import HTTP
from cryptography.fernet import Fernet
from ..config import config
from ..utils.logger import logger


class BybitClient:
    _403_last_logged: float = 0  # class-level: shared across instances
    _403_cooldown: int = 300     # suppress repeated 403 warnings for 5 min

    def __init__(self, api_key: str = None, api_secret: str = None,
                 paper_trading: bool = True, testnet: bool = None,
                 demo: bool = None, base_url: str = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.paper_trading = paper_trading
        # Allow explicit testnet/demo override; default to config
        _testnet = testnet if testnet is not None else config.BYBIT_TESTNET
        _demo = demo if demo is not None else config.BYBIT_DEMO
        _url = base_url if base_url is not None else config.BYBIT_DOMAIN
        
        # Handle Encryption/Decryption if keys are provided
        if self.api_key and self.api_secret and config.ENCRYPTION_KEY:
            try:
                f = Fernet(config.ENCRYPTION_KEY.encode())
                if not self.api_key.startswith('paper_'):
                    self.api_key = f.decrypt(self.api_key.encode()).decode()
                self.api_secret = f.decrypt(self.api_secret.encode()).decode()
            except Exception as e:
                logger.warning(f"Decryption failed: {e}")

        # pybit expects 'bybit' or 'bytick' for the domain parameter
        _domain_arg = 'bybit'
        if 'bytick' in _url.lower():
            _domain_arg = 'bytick'
            
        self.session = HTTP(
            testnet=_testnet,
            demo=_demo,
            domain=_domain_arg,
            api_key=self.api_key,
            api_secret=self.api_secret,
        )
        self.category = "linear"  # USDT perpetual futures

    # ─────────────────── ACCOUNT ───────────────────
    def get_balance(self) -> Dict[str, Any]:
        try:
            resp = self.session.get_wallet_balance(accountType="UNIFIED")
            if resp.get('retCode') == 0:
                coins = resp['result']['list'][0]['coin']
                usdt = next((c for c in coins if c['coin'] == 'USDT'), None)
                if usdt:
                    return {
                        'total': float(usdt.get('walletBalance', 0)),
                        'available': float(usdt.get('availableToWithdraw', 0)),
                        'unrealized_pnl': float(usdt.get('unrealisedPnl', 0)),
                    }
            return {'total': 0, 'available': 0, 'unrealized_pnl': 0}
        except Exception as e:
            logger.error(f"get_balance error: {e}")
            return {'total': 0, 'available': 0, 'unrealized_pnl': 0}

    # ─────────────────── MARKET DATA ───────────────────
    def get_klines(self, symbol: str, interval: str = '15',
                   limit: int = 200) -> List[Dict]:
        try:
            resp = self.session.get_kline(
                category=self.category, symbol=symbol,
                interval=interval, limit=limit
            )
            if resp.get('retCode') == 0:
                raw = resp['result']['list']
                candles = []
                for c in reversed(raw):
                    candles.append({
                        'time': int(c[0]) // 1000,
                        'open': float(c[1]),
                        'high': float(c[2]),
                        'low': float(c[3]),
                        'close': float(c[4]),
                        'volume': float(c[5]),
                    })
                return candles
            return []
        except Exception as e:
            err = str(e).encode('ascii', errors='replace').decode()
            if '403' in err:
                import time as _t
                now = _t.time()
                if now - BybitClient._403_last_logged > BybitClient._403_cooldown:
                    BybitClient._403_last_logged = now
                    logger.warning("Bybit API 403: rate limit or region block. Suppressing for 5 min.")
            else:
                logger.error(f"get_klines error {symbol}: {err}")
            return []

    def get_ticker(self, symbol: str) -> Optional[Dict]:
        try:
            resp = self.session.get_tickers(category=self.category, symbol=symbol)
            if resp.get('retCode') == 0 and resp['result']['list']:
                t = resp['result']['list'][0]
                def _f(val, default=0.0):
                    try:
                        return float(val) if val else default
                    except (ValueError, TypeError):
                        return default
                return {
                    'symbol': symbol,
                    'last_price': _f(t.get('lastPrice')),
                    'bid': _f(t.get('bid1Price')),
                    'ask': _f(t.get('ask1Price')),
                    'change_24h': _f(t.get('price24hPcnt')) * 100,
                    'volume_24h': _f(t.get('volume24h')),
                    'high_24h': _f(t.get('highPrice24h')),
                    'low_24h': _f(t.get('lowPrice24h')),
                }
            return None
        except Exception as e:
            err = str(e).encode('ascii', errors='replace').decode()
            if '403' in err:
                import time as _t
                now = _t.time()
                if now - BybitClient._403_last_logged > BybitClient._403_cooldown:
                    BybitClient._403_last_logged = now
                    logger.warning("Bybit API 403: rate limit or region block. Suppressing for 5 min.")
            else:
                logger.error(f"get_ticker error {symbol}: {err}")
            return None

    def get_all_tickers(self) -> List[Dict]:
        import time
        tickers = []
        for symbol in config.TRADING_PAIRS:
            t = self.get_ticker(symbol)
            if t:
                tickers.append(t)
            time.sleep(0.2)  # 200ms between calls to avoid rate limits
        return tickers

    def get_instrument_info(self, symbol: str) -> Optional[Dict]:
        try:
            resp = self.session.get_instruments_info(
                category=self.category, symbol=symbol
            )
            if resp.get('retCode') == 0:
                info = resp['result']['list'][0]
                lot = info['lotSizeFilter']
                price = info['priceFilter']
                return {
                    'min_qty': float(lot['minOrderQty']),
                    'qty_step': float(lot['qtyStep']),
                    'tick_size': float(price['tickSize']),
                    'min_notional': float(lot.get('minNotionalValue', 5)),
                }
            return None
        except Exception as e:
            logger.error(f"get_instrument_info error {symbol}: {e}")
            return None

    # ─────────────────── ORDERS ───────────────────
    def place_market_order(self, symbol: str, side: str, qty: float,
                           stop_loss: float = None,
                           take_profit: float = None) -> Optional[Dict]:
        if self.paper_trading:
            logger.info(f"[PAPER] {side} {qty} {symbol} SL={stop_loss} TP={take_profit}")
            return {'orderId': f'paper_{symbol}_{side}_{qty}', 'paper': True}

        # 1. Round Qty to Instrument Precision
        try:
            info = self.get_instrument_info(symbol)
            if info:
                step = info['qty_step']
                # Round down to nearest step to avoid 'balance insufficient' or precision errors
                qty = float(round(qty / step) * step)
                # Ensure it meets min_qty
                qty = max(qty, info['min_qty'])
                # Format to string with correct precision
                if step < 1:
                    decimals = len(str(step).split('.')[-1])
                    qty = round(qty, decimals)
                else:
                    qty = int(qty)
                
                # Check min_qty again after rounding
                if qty < info['min_qty']:
                    qty = info['min_qty']
        except Exception as e:
            logger.warning(f"Could not round qty for {symbol}: {e}")

        try:
            params: Dict[str, Any] = {
                'category': self.category,
                'symbol': symbol,
                'side': side,
                'orderType': 'Market',
                'qty': str(qty),
            }
            if stop_loss:
                params['stopLoss'] = str(round(stop_loss, 4))
            if take_profit:
                params['takeProfit'] = str(round(take_profit, 4))

            resp = self.session.place_order(**params)
            if resp.get('retCode') == 0:
                logger.info(f"Order placed: {side} {qty} {symbol} | ID={resp['result']['orderId']}")
                return resp['result']
            else:
                logger.error(f"Order failed: {resp.get('retMsg')}")
                return None
        except Exception as e:
            logger.error(f"place_market_order error: {e}")
            return None

    def cancel_order(self, symbol: str, order_id: str) -> bool:
        if self.paper_trading:
            return True
        try:
            resp = self.session.cancel_order(
                category=self.category, symbol=symbol, orderId=order_id
            )
            return resp.get('retCode') == 0
        except Exception as e:
            logger.error(f"cancel_order error: {e}")
            return False

    def close_position(self, symbol: str, side: str, qty: float) -> Optional[Dict]:
        close_side = 'Sell' if side == 'Buy' else 'Buy'
        return self.place_market_order(symbol, close_side, qty)

    # ─────────────────── POSITIONS ───────────────────
    def get_positions(self) -> List[Dict]:
        if self.paper_trading:
            return []
        try:
            resp = self.session.get_positions(
                category=self.category, settleCoin='USDT'
            )
            if resp.get('retCode') == 0:
                positions = []
                for p in resp['result']['list']:
                    if float(p.get('size', 0)) > 0:
                        positions.append({
                            'symbol': p['symbol'],
                            'side': p['side'],
                            'size': float(p['size']),
                            'entry_price': float(p['avgPrice']),
                            'unrealized_pnl': float(p['unrealisedPnl']),
                            'leverage': float(p['leverage']),
                        })
                return positions
            return []
        except Exception as e:
            logger.error(f"get_positions error: {e}")
            return []

    def set_leverage(self, symbol: str, leverage: int = 1) -> bool:
        if self.paper_trading:
            return True
        try:
            resp = self.session.set_leverage(
                category=self.category, symbol=symbol,
                buyLeverage=str(leverage), sellLeverage=str(leverage)
            )
            return resp.get('retCode') == 0
        except Exception as e:
            logger.error(f"set_leverage error: {e}")
            return False


# Public client for market data (no keys required)
public_bybit_client = BybitClient(paper_trading=config.PAPER_TRADING)
