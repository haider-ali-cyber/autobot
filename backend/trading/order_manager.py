import threading
import time
from typing import Dict, List, Optional, Callable
from ..config import config
from ..utils.logger import logger
from ..database.db_manager import db_manager
import json
from .risk_manager import risk_manager
from ..utils.notifier import DiscordNotifier
from ..exchange.bybit_client import BybitClient
from ..exchange.data_fetcher import data_fetcher


class OrderManager:
    """
    Handles order placement, position monitoring,
    and auto-close at SL/TP for both paper and live trading.
    """

    def __init__(self):
        self._paper_positions: Dict[str, Dict] = {}
        self._running = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._callbacks: List[Callable] = []

    def register_callback(self, cb: Callable):
        self._callbacks.append(cb)

    def _notify(self, data: dict, user_id: int = None):
        for cb in self._callbacks:
            try:
                # Include user_id in notification so frontend/WS knows where to route it
                data['user_id'] = user_id
                cb(data)
            except Exception as e:
                logger.error(f"OrderManager callback error: {e}")

    # ─────────────────── OPEN TRADE ───────────────────

    def open_trade(self, user, symbol: str, side: str, entry_price: float,
                   stop_loss: float, take_profit: float,
                   strategy: str, atr: float, manual_qty: float = None) -> Optional[Dict]:

        can_open, reason = risk_manager.can_open_trade(user)
        if not can_open:
            logger.warning(f"Trade blocked ({symbol}): {reason}")
            return None

        qty = manual_qty if manual_qty is not None else risk_manager.calculate_quantity(user, entry_price, stop_loss, side)
        if qty <= 0:
            logger.warning(f"Invalid qty for {symbol}")
            return None

        order_id = None
        is_paper = config.PAPER_TRADING  # Default to config, but can be per-user later
        
        if is_paper:
            order_id = f"paper_{symbol}_{side}_{int(time.time())}"
            logger.info(f"User {user.id} [PAPER] Opened: {side} {symbol} @ {entry_price}")
        else:
            # Instantiate user-specific client
            client = BybitClient(
                api_key=user.encrypted_api_key,
                api_secret=user.encrypted_api_secret,
                paper_trading=False
            )
            result = client.place_market_order(
                symbol, side, qty, stop_loss, take_profit
            )
            if not result:
                return None
            order_id = result.get('orderId')

        trade = db_manager.add_trade(
            user_id=user.id,
            symbol=symbol, side=side, entry_price=entry_price,
            quantity=qty, stop_loss=stop_loss, take_profit=take_profit,
            strategy=strategy, order_id=order_id,
            is_paper=is_paper
        )
        result_dict = {
            'trade_id': trade.id,
            'user_id': user.id,
            'symbol': symbol, 'side': side,
            'entry_price': entry_price, 'quantity': qty,
            'stop_loss': stop_loss, 'take_profit': take_profit,
            'order_id': order_id,
        }
        self._notify({'type': 'trade_opened', 'data': result_dict}, user_id=user.id)
        
        # User-specific notification
        if user.discord_webhook:
            dn = DiscordNotifier(user.discord_webhook)
            dn.notify_trade_opened(result_dict)
            
        return result_dict

    # ─────────────────── CLOSE TRADE ───────────────────

    def close_trade(self, trade, reason: str = 'manual',
                    current_price: float = None) -> bool:
        exit_price = current_price or data_fetcher.get_price(trade.symbol)
        if exit_price == 0:
            logger.error(f"Cannot close {trade.symbol}: price unavailable")
            return False

        pnl = risk_manager.calculate_pnl(
            trade.side, trade.entry_price, exit_price, trade.quantity
        )
        db_manager.close_trade(trade.id, exit_price, pnl, reason)

        # Handle Live Closure
        if not trade.is_paper and trade.order_id:
            user = db_manager.get_user_by_id(trade.user_id)
            if user:
                client = BybitClient(
                    api_key=user.encrypted_api_key,
                    api_secret=user.encrypted_api_secret,
                    paper_trading=False
                )
                client.close_position(trade.symbol, trade.side, trade.quantity)

        self._notify({'type': 'trade_closed', 'data': {
            'id': trade.id, 'symbol': trade.symbol, 'pnl': pnl, 'reason': reason
        }}, user_id=trade.user_id)

        # Notification
        user = db_manager.get_user_by_id(trade.user_id)
        if user and user.discord_webhook:
            dn = DiscordNotifier(user.discord_webhook)
            dn.notify_trade_closed({
                'symbol': trade.symbol,
                'reason': reason,
                'pnl': pnl,
                'exit_price': exit_price
            })
        return True

    # ─────────────────── MONITOR LOOP ───────────────────

    def _monitor_positions(self):
        logger.info("Position monitor started")
        while self._running:
            try:
                open_trades = db_manager.get_open_trades()
                for trade in open_trades:
                    current_price = data_fetcher.get_price(trade.symbol)
                    if current_price == 0:
                        continue

                    trade_dict = {
                        'side': trade.side,
                        'stop_loss': trade.stop_loss,
                        'take_profit': trade.take_profit,
                    }

                    # Check SL - close AT sl price to enforce $0.6 hard cap
                    if risk_manager.check_sl_hit(trade_dict, current_price):
                        self.close_trade(trade, 'sl_hit', trade.stop_loss)
                        logger.warning(
                            f"SL HIT: {trade.symbol} @ {trade.stop_loss} (market={current_price})"
                        )
                    # Check TP - close AT tp price
                    elif risk_manager.check_tp_hit(trade_dict, current_price):
                        self.close_trade(trade, 'tp_hit', trade.take_profit)
                        logger.info(
                            f"TP HIT: {trade.symbol} @ {trade.take_profit} (market={current_price})"
                        )
                    else:
                        # ─────────────────── PARTIAL TP / TRAILING SL LOGIC ───────────────────
                        try:
                            notes_data = json.loads(trade.notes) if trade.notes else {}
                        except json.JSONDecodeError:
                            notes_data = {}
                            
                        profit_target_dist = abs(trade.take_profit - trade.entry_price)
                        current_dist = 0
                        is_profitable = False
                        
                        if trade.side == 'Buy' and current_price > trade.entry_price:
                            current_dist = current_price - trade.entry_price
                            is_profitable = True
                        elif trade.side == 'Sell' and current_price < trade.entry_price:
                            current_dist = trade.entry_price - current_price
                            is_profitable = True

                        # Check if 50% target is reached
                        if is_profitable and profit_target_dist > 0 and (current_dist / profit_target_dist) >= 0.5:
                            
                            updates_made = False
                            
                            # 1. Partial Close (50% Volume)
                            if not notes_data.get('partial_closed'):
                                close_qty = round(trade.quantity / 2, 6)
                                remaining_qty = trade.quantity - close_qty
                                
                                # Execute on Exchange if Live
                                if not trade.is_paper and trade.order_id:
                                    user = db_manager.get_user_by_id(trade.user_id)
                                    if user:
                                        client = BybitClient(
                                            api_key=user.encrypted_api_key,
                                            api_secret=user.encrypted_api_secret,
                                            paper_trading=False
                                        )
                                        client.close_position(trade.symbol, trade.side, close_qty)
                                
                                # Update DB & Notify
                                db_manager.update_trade_quantity(trade.id, remaining_qty)
                                trade.quantity = remaining_qty # Update localized object for subsequent SL check if needed
                                notes_data['partial_closed'] = True
                                updates_made = True
                                
                                logger.info(f"PARTIAL TP: Closed {close_qty} of {trade.symbol} at {current_price}")
                                
                                # Discord notification
                                user = db_manager.get_user_by_id(trade.user_id)
                                if user and user.discord_webhook:
                                    dn = DiscordNotifier(user.discord_webhook)
                                    locked_pnl = risk_manager.calculate_pnl(trade.side, trade.entry_price, current_price, close_qty)
                                    dn.notify_partial_close({'symbol': trade.symbol}, locked_pnl)
                                    
                            # 2. Trailing Stop Loss to Breakeven
                            if not notes_data.get('sl_moved_breakeven'):
                                new_sl = trade.entry_price
                                old_sl = trade.stop_loss
                                
                                # DB Update
                                db_manager.update_trade_sl(trade.id, new_sl)
                                trade.stop_loss = new_sl # Update local memory
                                notes_data['sl_moved_breakeven'] = True
                                updates_made = True
                                
                                logger.info(f"TRAILING SL: Moved {trade.symbol} SL from {old_sl} to Breakeven {new_sl}")
                                
                                # Discord notification
                                user = db_manager.get_user_by_id(trade.user_id)
                                if user and user.discord_webhook:
                                    dn = DiscordNotifier(user.discord_webhook)
                                    dn.notify_trailing_sl({'symbol': trade.symbol}, old_sl, new_sl)

                            if updates_made:
                                db_manager.update_trade_notes(trade.id, json.dumps(notes_data))
                        # ─────────────────────────────────────────────────────────────────────────
            except Exception as e:
                logger.error(f"Monitor error: {e}")
            time.sleep(2)

    def start_monitor(self):
        if not self._running:
            self._running = True
            self._monitor_thread = threading.Thread(
                target=self._monitor_positions, daemon=True
            )
            self._monitor_thread.start()

    def stop_monitor(self):
        self._running = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)

    def get_open_positions_summary(self, user_id: int) -> List[Dict]:
        trades = db_manager.get_open_trades(user_id)
        result = []
        for t in trades:
            current = data_fetcher.get_price(t.symbol)
            pnl = risk_manager.calculate_pnl(t.side, t.entry_price, current, t.quantity)
            result.append({
                'id': t.id,
                'symbol': t.symbol,
                'side': t.side,
                'entry_price': t.entry_price,
                'current_price': current,
                'quantity': t.quantity,
                'stop_loss': t.stop_loss,
                'take_profit': t.take_profit,
                'pnl': pnl,
                'strategy': t.strategy,
                'is_paper': t.is_paper,
                'opened_at': t.created_at.isoformat() if t.created_at else None,
            })
        return result


order_manager = OrderManager()
