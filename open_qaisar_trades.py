import sys
import time
from backend.database.db_manager import db_manager
from backend.trading.order_manager import order_manager
from backend.exchange.data_fetcher import data_fetcher
from backend.config import config

# FORCE live trading
config.PAPER_TRADING = False

data_fetcher.start()
time.sleep(2) # Give it a moment to fetch prices

u = db_manager.get_user_by_username("qaisar")
if not u:
    print("User qaisar not found")
    sys.exit()

trades_to_open = [
    {"symbol": "ADAUSDT", "side": "Buy", "leverage": 1, "usdt": 5.0},
    {"symbol": "XRPUSDT", "side": "Buy", "leverage": 1, "usdt": 5.0}
]

print(f"Opening trades for {u.username} with Live API keys...")

for t in trades_to_open:
    symbol = t["symbol"]
    side = t["side"]
    price = data_fetcher.get_price(symbol)
    if price == 0:
        print(f"Could not fetch price for {symbol}")
        continue
    
    qty = t["usdt"] / price
    
    # Simple SL/TP for testing
    sl = price * 0.98 if side == "Buy" else price * 1.02
    tp = price * 1.02 if side == "Buy" else price * 0.98
    
    print(f"Executing {side} on {symbol} @ {price}... Qty: {qty}")
    
    trade = order_manager.open_trade(
        user=u,
        symbol=symbol,
        side=side,
        entry_price=price,
        stop_loss=sl,
        take_profit=tp,
        strategy="Manual Action from Admin",
        atr=0,
        manual_qty=qty
    )
    
    if trade:
        print(f"Success! Trade opened: {trade}")
    else:
        print(f"Failed to open trade for {symbol}")
    
    time.sleep(1)

data_fetcher.stop()
