from typing import Optional, Dict, Tuple
from ..config import config
from ..utils.logger import logger
from ..database.db_manager import db_manager


class RiskManager:
    """
    Enforces all risk rules:
    - Hard stop loss cap at $0.6
    - Take profit range $0.4 - $1.0
    - Max 100 simultaneous open trades
    - Daily loss limit
    - Position sizing based on capital & risk %
    """

    def __init__(self):
        # We store defaults from config, but will prefer user-specific values in methods
        pass

    # ─────────────────── VALIDATION ───────────────────

    def can_open_trade(self, user) -> Tuple[bool, str]:
        open_count = db_manager.count_open_trades(user.id)
        max_trades = config.MAX_OPEN_TRADES # Constant for now, can be per-user later
        
        if open_count >= max_trades:
            return False, f"Max trades reached ({max_trades})"

        # Daily loss limit only applies to live trading
        if not config.PAPER_TRADING and not config.BYBIT_TESTNET:
            daily_loss = db_manager.get_daily_pnl(user.id)
            if daily_loss <= -user.max_daily_loss: # Use user's limit if defined, else config
                max_loss = getattr(user, 'max_daily_loss', config.MAX_DAILY_LOSS_USD)
                if daily_loss <= -max_loss:
                    return False, f"Daily loss limit hit (${abs(daily_loss):.2f})"

        return True, "OK"

    def validate_sl_tp(self, entry: float, sl: float, tp: float,
                       side: str) -> Tuple[bool, str]:
        if side == 'Buy':
            sl_dist = entry - sl
            tp_dist = tp - entry
        else:
            sl_dist = sl - entry
            tp_dist = entry - tp

        if sl_dist <= 0:
            return False, "SL must be on the losing side of entry"
        if tp_dist <= 0:
            return False, "TP must be on the winning side of entry"

        return True, "OK"

    # ─────────────────── POSITION SIZING ───────────────────

    def calculate_quantity(self, user, entry_price: float, sl_price: float,
                           side: str, available_balance: float = None) -> float:
        """
        Calculate position quantity so that the SL loss never exceeds
        the user's MAX_STOP_LOSS_USD (Default $0.6) no matter what.
        """
        if available_balance is None:
            # Use user-defined capital for position sizing (SaaS mode)
            balance = user.trading_capital
        else:
            balance = available_balance
            
        risk_pct = user.risk_per_trade / 100
        max_sl = user.max_sl_usd
        
        risk_amount = min(
            balance * risk_pct,
            max_sl
        )

        if side == 'Buy':
            price_diff = abs(entry_price - sl_price)
        else:
            price_diff = abs(sl_price - entry_price)

        if price_diff == 0:
            return 0

        qty = risk_amount / price_diff
        return round(qty, 6)

    # ─────────────────── SL / TP CALCULATION ───────────────────

    def calculate_sl_tp(self, entry_price: float, side: str,
                        atr: float) -> Dict[str, float]:
        """
        Pure ATR-based SL/TP (Dynamic Volatility).
        Uses 1.5x ATR for Stop Loss and 2.5x ATR for Take Profit.
        Quantity sizing will adjust math later to keep dollar risk fixed.
        """
        atr_sl_mult = 1.5
        atr_tp_mult = 2.5

        # Protect against 0 ATR in edge cases
        safe_atr = atr if atr > 0 else (entry_price * 0.005)

        if side == 'Buy':
            raw_sl = entry_price - safe_atr * atr_sl_mult
            raw_tp = entry_price + safe_atr * atr_tp_mult
            sl_dist = entry_price - raw_sl
            tp_dist = raw_tp - entry_price
        else:
            raw_sl = entry_price + safe_atr * atr_sl_mult
            raw_tp = entry_price - safe_atr * atr_tp_mult
            sl_dist = raw_sl - entry_price
            tp_dist = entry_price - raw_tp

        # We keep the min_tp / max_tp checks ONLY as a safety bound for extreme low/high volatility
        # but let ATR drive the core distance.
        if tp_dist < self.min_tp:
            tp_dist = self.min_tp
            raw_tp = entry_price + tp_dist if side == 'Buy' else entry_price - tp_dist
            
        if tp_dist > self.max_tp * 2: # Give it more breathing room for breakouts
            tp_dist = self.max_tp * 2
            raw_tp = entry_price + tp_dist if side == 'Buy' else entry_price - tp_dist

        return {
            'stop_loss': round(raw_sl, 4),
            'take_profit': round(raw_tp, 4),
            'sl_distance': round(sl_dist, 4),
            'tp_distance': round(tp_dist, 4),
            'rr_ratio': round(tp_dist / sl_dist, 2) if sl_dist > 0 else 0,
        }

    def get_micro_tp_levels(self, entry_price: float, side: str) -> list:
        """
        Returns multiple micro TP levels: $0.4, $0.6, $0.8, $1.0
        """
        levels = []
        for profit_target in config.PROFIT_LEVELS:
            if side == 'Buy':
                tp = entry_price + profit_target
            else:
                tp = entry_price - profit_target
            levels.append({'target_usd': profit_target, 'price': round(tp, 4)})
        return levels

    def check_sl_hit(self, trade, current_price: float) -> bool:
        if trade['side'] == 'Buy':
            return current_price <= trade['stop_loss']
        else:
            return current_price >= trade['stop_loss']

    def check_tp_hit(self, trade, current_price: float) -> bool:
        if trade['side'] == 'Buy':
            return current_price >= trade['take_profit']
        else:
            return current_price <= trade['take_profit']

    def calculate_pnl(self, side: str, entry: float, current: float,
                      qty: float) -> float:
        if side == 'Buy':
            return round((current - entry) * qty, 4)
        else:
            return round((entry - current) * qty, 4)


risk_manager = RiskManager()
