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
        self.max_sl = config.MAX_STOP_LOSS_USD         # $0.6 hard limit
        self.min_tp = config.MIN_TAKE_PROFIT_USD       # $0.4
        self.max_tp = config.MAX_TAKE_PROFIT_USD       # $1.0
        self.max_trades = config.MAX_OPEN_TRADES       # 100
        self.risk_pct = config.RISK_PER_TRADE_PERCENT  # 1%
        self.max_daily_loss = config.MAX_DAILY_LOSS_USD
        self.capital = config.INITIAL_CAPITAL

    # ─────────────────── VALIDATION ───────────────────

    def can_open_trade(self, user_id: int) -> Tuple[bool, str]:
        open_count = db_manager.count_open_trades(user_id)
        if open_count >= self.max_trades:
            return False, f"Max trades reached ({self.max_trades})"

        # Daily loss limit only applies to live trading
        if not config.PAPER_TRADING and not config.BYBIT_TESTNET:
            daily_loss = db_manager.get_daily_pnl(user_id)
            if daily_loss <= -self.max_daily_loss:
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

    def calculate_quantity(self, entry_price: float, sl_price: float,
                           side: str, available_balance: float = None) -> float:
        """
        Calculate position quantity so that the SL loss never exceeds
        MAX_STOP_LOSS_USD ($0.6) no matter what.
        """
        balance = available_balance or self.capital
        risk_amount = min(
            balance * (self.risk_pct / 100),
            self.max_sl
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
        ATR-based SL/TP capped at $0.6 SL and $0.4-$1.0 TP range.
        Uses 1.5x ATR for SL, 2.5x ATR for TP — but always enforces
        the dollar caps.
        """
        atr_sl_mult = 1.5
        atr_tp_mult = 2.5

        if side == 'Buy':
            raw_sl = entry_price - atr * atr_sl_mult
            raw_tp = entry_price + atr * atr_tp_mult
        else:
            raw_sl = entry_price + atr * atr_sl_mult
            raw_tp = entry_price - atr * atr_tp_mult

        qty_for_check = 1.0
        if side == 'Buy':
            sl_loss_per_unit = entry_price - raw_sl
            tp_gain_per_unit = raw_tp - entry_price
        else:
            sl_loss_per_unit = raw_sl - entry_price
            tp_gain_per_unit = entry_price - raw_tp

        # Enforce hard SL cap: price distance adjusted so loss at qty=1 is ≤ $0.6
        if sl_loss_per_unit > self.max_sl:
            sl_loss_per_unit = self.max_sl
            if side == 'Buy':
                raw_sl = entry_price - sl_loss_per_unit
            else:
                raw_sl = entry_price + sl_loss_per_unit

        # Enforce TP range $0.4-$1.0 (assuming qty=1 unit for reference)
        tp_gain_per_unit = max(self.min_tp, min(self.max_tp, tp_gain_per_unit))
        if side == 'Buy':
            raw_tp = entry_price + tp_gain_per_unit
        else:
            raw_tp = entry_price - tp_gain_per_unit

        return {
            'stop_loss': round(raw_sl, 4),
            'take_profit': round(raw_tp, 4),
            'sl_distance': round(sl_loss_per_unit, 4),
            'tp_distance': round(tp_gain_per_unit, 4),
            'rr_ratio': round(tp_gain_per_unit / sl_loss_per_unit, 2)
                        if sl_loss_per_unit > 0 else 0,
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
