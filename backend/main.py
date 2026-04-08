import asyncio
import json
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from .config import config
from .utils.logger import logger
from .utils import auth
from .exchange.data_fetcher import data_fetcher
from .trading.engine import trading_engine
from .trading.order_manager import order_manager
from .database.models import User
from .database.db_manager import db_manager
from .utils.news_fetcher import news_fetcher

app = FastAPI(title="Auto Crypto Trading Bot", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────── WEBSOCKET MANAGER ───────────────────

class ConnectionManager:
    def __init__(self):
        # user_id -> List[WebSocket]
        self.active_users: dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        if user_id not in self.active_users:
            self.active_users[user_id] = []
        self.active_users[user_id].append(ws)
        logger.info(f"User {user_id} connected via WS")

    def disconnect(self, user_id: int, ws: WebSocket):
        if user_id in self.active_users and ws in self.active_users[user_id]:
            self.active_users[user_id].remove(ws)
            if not self.active_users[user_id]:
                del self.active_users[user_id]

    async def broadcast_to_user(self, user_id: int, message: dict):
        if user_id not in self.active_users:
            return
        data = json.dumps(message)
        dead = []
        for ws in self.active_users[user_id]:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)

manager = ConnectionManager()
_event_loop: Optional[asyncio.AbstractEventLoop] = None

# Register callback for trade updates
def on_trade_update(data: dict):
    user_id = data.get('user_id')
    if user_id and _event_loop and _event_loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_to_user(user_id, data), _event_loop
        )

# Register callback for price updates (broadcast to ALL connected users)
def on_price_update(data: dict):
    if _event_loop and _event_loop.is_running():
        for user_id in list(manager.active_users.keys()):
            asyncio.run_coroutine_threadsafe(
                manager.broadcast_to_user(user_id, data), _event_loop
            )

order_manager.register_callback(on_trade_update)
data_fetcher.register_callback(on_price_update)

# ─────────────────── AUTHENTICATION ───────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db_manager.get_user_by_username(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.post("/auth/register")
def register(username: str, password: str):
    if db_manager.get_user_by_username(username):
        raise HTTPException(status_code=400, detail="Username taken")
    hashed = auth.get_password_hash(password)
    user = db_manager.create_user(username, hashed)
    return {"message": "Success", "user_id": user.id}

@app.post("/auth/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db_manager.get_user_by_username(form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# ─────────────────── WEBSOCKET ENDPOINT ───────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    if not token:
        await websocket.close(code=1008)
        return
    
    payload = auth.decode_access_token(token)
    if not payload:
        await websocket.close(code=1008)
        return
        
    user = db_manager.get_user_by_username(payload.get("sub"))
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            # Send status and positions every 5s
            await websocket.send_text(json.dumps({
                'type': 'status',
                'data': trading_engine.get_status(user.id)
            }))
            positions = order_manager.get_open_positions_summary(user.id)
            await websocket.send_text(json.dumps({
                'type': 'positions', 'data': positions
            }))
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
    except Exception as e:
        logger.error(f"WS error user {user.id}: {e}")
        manager.disconnect(user.id, websocket)

# ─────────────────── REST API ───────────────────

@app.get("/api/status")
def get_status(user: User = Depends(get_current_user)):
    return trading_engine.get_status(user.id)

@app.get("/api/prices")
def get_prices(user: User = Depends(get_current_user)):
    # Return cached prices (populated by background poller) to avoid burst API calls
    if data_fetcher.tickers:
        return data_fetcher.tickers
    # On cold start before first poll completes, do one live fetch
    return data_fetcher.fetch_all_prices()

@app.get("/api/balance")
def get_balance(user: User = Depends(get_current_user)):
    from .exchange.bybit_client import BybitClient
    client = BybitClient(
        api_key=user.encrypted_api_key,
        api_secret=user.encrypted_api_secret,
        paper_trading=config.PAPER_TRADING
    )
    return client.get_balance()

@app.get("/api/positions")
def get_positions(user: User = Depends(get_current_user)):
    return order_manager.get_open_positions_summary(user.id)

@app.get("/api/trades")
def get_trades(limit: int = 50, user: User = Depends(get_current_user)):
    trades = db_manager.get_trade_history(user.id, limit)
    return [
        {
            'id': t.id,
            'symbol': t.symbol, 'side': t.side,
            'entry_price': t.entry_price, 'exit_price': t.exit_price,
            'quantity': t.quantity, 'stop_loss': t.stop_loss,
            'take_profit': t.take_profit, 'pnl': t.pnl,
            'status': t.status, 'strategy': t.strategy,
            'created_at': t.created_at.isoformat() if t.created_at else None,
            'closed_at': t.closed_at.isoformat() if t.closed_at else None,
        } for t in trades
    ]

@app.get("/api/stats")
def get_stats(user: User = Depends(get_current_user)):
    return db_manager.get_stats(user.id)

@app.get("/api/signals")
def get_signals(user: User = Depends(get_current_user)):
    return trading_engine.get_signals_cache()

@app.get("/api/pnl-history")
def get_pnl_history(days: int = 30, user: User = Depends(get_current_user)):
    return db_manager.get_pnl_history(user.id, days)

@app.get("/api/drawdown")
def get_drawdown(user: User = Depends(get_current_user)):
    return db_manager.get_drawdown_stats(user.id)

@app.get("/api/trades/export")
def export_trades(user: User = Depends(get_current_user)):
    csv_data = db_manager.export_trades_csv(user.id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trade_history.csv"}
    )

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "bot_status": trading_engine.status}

# ─────────────────── BOT CONTROLS ───────────────────

@app.post("/api/bot/start")
def start_bot(user: User = Depends(get_current_user)):
    if not user.is_admin:
         raise HTTPException(status_code=403, detail="Only Admin can control engine")
    trading_engine.start()
    db_manager.log_audit(user.id, "bot_start", "Admin started the engine")
    return {"message": "Bot started"}

@app.post("/api/bot/stop")
def stop_bot(user: User = Depends(get_current_user)):
    if not user.is_admin:
         raise HTTPException(status_code=403, detail="Only Admin can control engine")
    trading_engine.stop()
    db_manager.log_audit(user.id, "bot_stop", "Admin stopped the engine")
    return {"message": "Bot stopped"}

class CloseTradeRequest(BaseModel):
    trade_id: int

@app.post("/api/trade/close")
def close_trade(req: CloseTradeRequest, user: User = Depends(get_current_user)):
    trades = db_manager.get_open_trades(user.id)
    trade = next((t for t in trades if t.id == req.trade_id), None)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    success = order_manager.close_trade(trade, reason='manual')
    db_manager.log_audit(user.id, "manual_close", f"Manually closed {trade.symbol}")
    return {"success": success}

class ManualTradeRequest(BaseModel):
    symbol: str
    side: str
    qty: float
    stop_loss: float
    take_profit: float

@app.post("/api/trade/manual")
def manual_trade(req: ManualTradeRequest, user: User = Depends(get_current_user)):
    # Verify symbol exists in configured pairs
    if req.symbol not in config.TRADING_PAIRS:
        raise HTTPException(status_code=400, detail=f"Symbol {req.symbol} is not configured for trading")
    
    trade = order_manager.open_trade(
        user=user,
        symbol=req.symbol,
        side=req.side,
        entry_price=data_fetcher.get_price(req.symbol),
        stop_loss=req.stop_loss,
        take_profit=req.take_profit,
        strategy="Manual",
        atr=0 # Manual trades don't use dynamic ATR
    )
    if not trade:
        raise HTTPException(status_code=500, detail="Failed to open manual trade")
    
    db_manager.log_audit(user.id, "manual_entry", f"Opened {req.side} for {req.symbol}")
    return {"message": "Success", "trade_id": trade.id}

@app.get("/api/market/news")
def get_market_news():
    return {
        "news": news_fetcher.fetch_news(),
        "sessions": news_fetcher.get_market_sessions()
    }

class SettingsRequest(BaseModel):
    max_stop_loss: float
    min_take_profit: float
    max_take_profit: float
    max_open_trades: int
    risk_per_trade: float
    max_daily_loss: float
    paper_trading: bool
    discord_webhook: Optional[str] = None
    bybit_api_key: Optional[str] = None
    bybit_api_secret: Optional[str] = None

@app.post("/api/settings")
def update_settings(req: SettingsRequest, user: User = Depends(get_current_user)):
    # Update core config if admin
    if user.is_admin:
        config.MAX_STOP_LOSS_USD = req.max_stop_loss
        config.MIN_TAKE_PROFIT_USD = req.min_take_profit
        config.MAX_TAKE_PROFIT_USD = req.max_take_profit
        config.MAX_OPEN_TRADES = req.max_open_trades
        config.RISK_PER_TRADE_PERCENT = req.risk_per_trade
        config.MAX_DAILY_LOSS_USD = req.max_daily_loss
        config.PAPER_TRADING = req.paper_trading
        # Also update risk_manager in-memory values
        from .trading.risk_manager import risk_manager
        risk_manager.max_sl = req.max_stop_loss
        risk_manager.min_tp = req.min_take_profit
        risk_manager.max_tp = req.max_take_profit
        risk_manager.max_trades = req.max_open_trades
        risk_manager.risk_pct = req.risk_per_trade
        risk_manager.max_daily_loss = req.max_daily_loss

    # Update User Specifics
    webhook = req.discord_webhook if req.discord_webhook is not None else user.discord_webhook
    if req.bybit_api_key and req.bybit_api_secret:
        db_manager.update_user_api_keys(user.id, req.bybit_api_key, req.bybit_api_secret, webhook)
    else:
        db_manager.update_user_api_keys(user.id, user.encrypted_api_key, user.encrypted_api_secret, webhook)

    db_manager.log_audit(user.id, "settings_update", "User updated personal settings")
    return {"message": "Settings updated"}

@app.get("/api/settings")
def get_settings(user: User = Depends(get_current_user)):
    return {
        "max_stop_loss": config.MAX_STOP_LOSS_USD,
        "min_take_profit": config.MIN_TAKE_PROFIT_USD,
        "max_take_profit": config.MAX_TAKE_PROFIT_USD,
        "max_open_trades": config.MAX_OPEN_TRADES,
        "risk_per_trade": config.RISK_PER_TRADE_PERCENT,
        "max_daily_loss": config.MAX_DAILY_LOSS_USD,
        "paper_trading": config.PAPER_TRADING,
        "trading_pairs": config.TRADING_PAIRS,
        "discord_webhook": user.discord_webhook,
        "has_api_keys": user.encrypted_api_key is not None,
        "is_admin": user.is_admin,
    }

# ─────────────────── STARTUP ───────────────────

@app.on_event("startup")
async def on_startup():
    global _event_loop
    _event_loop = asyncio.get_running_loop()
    trading_engine.start()  # also starts data_fetcher internally

@app.on_event("shutdown")
async def on_shutdown():
    trading_engine.stop()
    data_fetcher.stop()
