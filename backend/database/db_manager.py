import csv
import io
import json
from collections import defaultdict
from datetime import datetime
from typing import List, Optional, Dict, Any

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from bson import ObjectId

from .models import TradeModel, PortfolioModel, SignalModel, BotSettingsModel, UserInDB
from ..config import config
from ..utils.logger import logger

class DBManager:
    def __init__(self):
        try:
            self.client = MongoClient(config.MONGO_URI, serverSelectionTimeoutMS=5000)
            # Will trigger exception if not connected
            self.client.admin.command('ping')
            self.db = self.client['autobot_db']
            logger.info(f"Connected to MongoDB successfully at {config.MONGO_URI}")
            self._init_indexes()
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise e

    def _init_indexes(self):
        # Create indexes for faster queries
        self.db.users.create_index("username", unique=True)
        self.db.trades.create_index([("user_id", 1), ("status", 1)])
        self.db.portfolio.create_index("user_id")
        self.db.bot_settings.create_index([("user_id", 1), ("key", 1)], unique=True)

    def _obj_to_dict(self, obj) -> Dict:
        """Helper to convert objects to dict, removing _id if it's new"""
        d = obj.model_dump(by_alias=True)
        if d.get("_id") == "":
            del d["_id"]
        return d

    # ─────────────────── TRADES ───────────────────
    def add_trade(self, user_id: str, symbol: str, side: str, entry_price: float,
                  quantity: float, stop_loss: float, take_profit: float,
                  strategy: str, order_id: str = None,
                  is_paper: bool = True):
                  
        trade = TradeModel(
            _id="",
            user_id=str(user_id), symbol=symbol, side=side, entry_price=entry_price,
            quantity=quantity, stop_loss=stop_loss, take_profit=take_profit,
            strategy=strategy, order_id=order_id, is_paper=is_paper, status='open'
        )
        
        doc = self._obj_to_dict(trade)
        result = self.db.trades.insert_one(doc)
        doc['_id'] = str(result.inserted_id)
        logger.info(f"User {user_id} Trade added: {symbol} {side} @ {entry_price}")
        return TradeModel(**doc)

    def close_trade(self, trade_id: str, exit_price: float,
                    pnl: float, reason: str = 'manual'):
        trade = self.db.trades.find_one({"_id": ObjectId(trade_id)})
        if trade:
            pnl_percent = 0.0
            if trade.get('entry_price') and trade.get('quantity'):
                pnl_percent = round((pnl / (trade['entry_price'] * trade['quantity'])) * 100, 2)
                
            self.db.trades.update_one(
                {"_id": ObjectId(trade_id)},
                {"$set": {
                    "exit_price": exit_price,
                    "pnl": round(pnl, 4),
                    "pnl_percent": pnl_percent,
                    "status": 'closed',
                    "close_reason": reason,
                    "closed_at": datetime.utcnow()
                }}
            )
            logger.info(f"Trade closed: ID={trade_id} PnL=${pnl:.4f} reason={reason}")

    def update_trade_quantity(self, trade_id: str, new_quantity: float):
        self.db.trades.update_one({"_id": ObjectId(trade_id)}, {"$set": {"quantity": new_quantity}})
                
    def update_trade_sl(self, trade_id: str, new_sl: float):
        self.db.trades.update_one({"_id": ObjectId(trade_id)}, {"$set": {"stop_loss": new_sl}})
                
    def update_trade_notes(self, trade_id: str, notes: str):
        self.db.trades.update_one({"_id": ObjectId(trade_id)}, {"$set": {"notes": notes}})

    def get_open_trades(self, user_id: Optional[str] = None) -> List[TradeModel]:
        query = {"status": "open"}
        if user_id:
            query["user_id"] = str(user_id)
        docs = list(self.db.trades.find(query))
        for d in docs: d['_id'] = str(d['_id'])
        return [TradeModel(**d) for d in docs]

    def get_trade_by_id(self, trade_id: str) -> Optional[TradeModel]:
        trade = self.db.trades.find_one({"_id": ObjectId(trade_id)})
        if trade:
            trade['_id'] = str(trade['_id'])
            return TradeModel(**trade)
        return None

    def get_trade_history(self, user_id: str, limit: int = 50) -> List[TradeModel]:
        docs = list(self.db.trades.find(
            {"user_id": str(user_id)}
        ).sort("closed_at", -1).limit(limit))
        for d in docs: d['_id'] = str(d['_id'])
        return [TradeModel(**d) for d in docs]

    # ─────────────────── SIGNALS ───────────────────
    def add_signal(self, symbol: str, signal_type: str, strength: float,
                   strategy: str, indicators: dict, candle_pattern: str = None,
                   user_id: Optional[str] = None):
                   
        sig = SignalModel(
            _id="",
            symbol=symbol, signal_type=signal_type, strength=strength,
            strategy=strategy, indicators=json.dumps(indicators),
            candle_pattern=candle_pattern, detected_by_user_id=str(user_id) if user_id else None
        )
        self.db.signals.insert_one(self._obj_to_dict(sig))

    def get_recent_signals(self, limit: int = 10, user_id: Optional[str] = None) -> List[SignalModel]:
        query = {}
        if user_id:
            # fetch global signals (no user) OR signals assigned to this user
            query = {"$or": [{"detected_by_user_id": None}, {"detected_by_user_id": str(user_id)}]}
            
        docs = list(self.db.signals.find(query).sort("created_at", -1).limit(limit))
        for d in docs: d['_id'] = str(d['_id'])
        return [SignalModel(**d) for d in docs]

    def mark_signal_acted(self, symbol: str):
        self.db.signals.update_many(
            {"symbol": symbol, "acted_on": False},
            {"$set": {"acted_on": True}}
        )

    # ─────────────────── PORTFOLIO ───────────────────
    def get_portfolio(self, user_id: str) -> PortfolioModel:
        p = self.db.portfolio.find_one({"user_id": str(user_id)})
        if p:
            p['_id'] = str(p['_id'])
            return PortfolioModel(**p)
        
        # Create default
        new_p = PortfolioModel(_id="", user_id=str(user_id))
        doc = self._obj_to_dict(new_p)
        res = self.db.portfolio.insert_one(doc)
        doc['_id'] = str(res.inserted_id)
        return PortfolioModel(**doc)

    def get_daily_pnl(self, user_id: str) -> float:
        today = datetime.utcnow().date()
        start = datetime(today.year, today.month, today.day)
        
        pipeline = [
            {"$match": {
                "user_id": str(user_id),
                "status": "closed",
                "closed_at": {"$gte": start}
            }},
            {"$group": {"_id": None, "total_pnl": {"$sum": "$pnl"}}}
        ]
        res = list(self.db.trades.aggregate(pipeline))
        return res[0]['total_pnl'] if res else 0.0

    def update_portfolio(self, user_id: str):
        # Gather stats
        closed = list(self.db.trades.find({"user_id": str(user_id), "status": "closed"}))
        open_t = list(self.db.trades.find({"user_id": str(user_id), "status": "open"}))
        
        total = len(closed)
        wins = len([t for t in closed if t.get('pnl', 0) > 0])
        realized_pnl = sum(t.get('pnl', 0) for t in closed)
        daily_pnl = self.get_daily_pnl(user_id)
        
        win_rate = round((wins / total * 100) if total > 0 else 0, 2)
        
        # update document
        self.db.portfolio.update_one(
            {"user_id": str(user_id)},
            {"$set": {
                "realized_pnl": round(realized_pnl, 4),
                "daily_pnl": round(daily_pnl, 4),
                "total_trades": total,
                "winning_trades": wins,
                "losing_trades": total - wins,
                "win_rate": win_rate,
                "timestamp": datetime.utcnow()
            }},
            upsert=True
        )

    # ─────────────────── STATS ───────────────────
    def get_stats(self, user_id: str) -> dict:
        closed = list(self.db.trades.find({"user_id": str(user_id), "status": "closed"}))
        total = len(closed)
        wins = len([t for t in closed if t.get('pnl', 0) > 0])
        total_pnl = sum(t.get('pnl', 0) for t in closed)
        open_count = self.db.trades.count_documents({"user_id": str(user_id), "status": "open"})
        
        return {
            'total_trades': total,
            'winning_trades': wins,
            'losing_trades': total - wins,
            'win_rate': round((wins / total * 100) if total > 0 else 0, 2),
            'total_pnl': round(total_pnl, 4),
            'avg_pnl': round(total_pnl / total if total > 0 else 0, 4),
            'open_trades': open_count,
            'daily_pnl': self.get_daily_pnl(user_id),
        }

    # ─────────────────── PNL HISTORY ───────────────────
    def get_pnl_history(self, user_id: str, days: int = 30) -> list:
        closed = list(self.db.trades.find(
            {"user_id": str(user_id), "status": "closed"}
        ).sort("closed_at", 1))

        daily = defaultdict(float)
        for t in closed:
            if t.get('closed_at'):
                day_key = t['closed_at'].strftime('%Y-%m-%d')
                daily[day_key] += (t.get('pnl') or 0)

        sorted_days = sorted(daily.keys())
        if days:
            sorted_days = sorted_days[-days:]
        
        cumulative = 0.0
        result = []
        for d in sorted_days:
            cumulative += daily[d]
            result.append({
                'date': d,
                'pnl': round(daily[d], 4),
                'cumulative': round(cumulative, 4),
            })
        return result

    def get_drawdown_stats(self, user_id: str) -> dict:
        closed = list(self.db.trades.find(
            {"user_id": str(user_id), "status": "closed"}
        ).sort("closed_at", 1))

        if not closed:
            return {'max_drawdown': 0, 'current_drawdown': 0, 'peak_pnl': 0, 'current_pnl': 0}

        cumulative = 0.0
        peak = 0.0
        max_dd = 0.0
        for t in closed:
            cumulative += (t.get('pnl') or 0)
            if cumulative > peak:
                peak = cumulative
            dd = peak - cumulative
            if dd > max_dd:
                max_dd = dd

        current_dd = peak - cumulative
        return {
            'max_drawdown': round(max_dd, 4),
            'current_drawdown': round(current_dd, 4),
            'peak_pnl': round(peak, 4),
            'current_pnl': round(cumulative, 4),
        }

    def export_trades_csv(self, user_id: str) -> str:
        trades = list(self.db.trades.find(
            {"user_id": str(user_id)}
        ).sort("created_at", -1))
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Symbol', 'Side', 'Entry', 'Exit', 'Qty',
                         'SL', 'TP', 'PnL', 'PnL%', 'Status', 'Strategy',
                         'Reason', 'Paper', 'Opened', 'Closed'])
        for t in trades:
            writer.writerow([
                str(t['_id']), t.get('symbol'), t.get('side'), t.get('entry_price'), t.get('exit_price'),
                t.get('quantity'), t.get('stop_loss'), t.get('take_profit'), t.get('pnl'),
                t.get('pnl_percent'), t.get('status'), t.get('strategy'), t.get('close_reason'),
                t.get('is_paper'),
                t.get('created_at').isoformat() if t.get('created_at') else '',
                t.get('closed_at').isoformat() if t.get('closed_at') else '',
            ])
        return output.getvalue()

    # ─────────────────── AUDIT LOG ───────────────────
    def log_audit(self, user_id: str, action: str, details: str = ''):
        key = f"audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{action}"
        self.set_setting(user_id, key, details)

    # ─────────────────── SETTINGS ───────────────────
    def set_setting(self, user_id: str, key: str, value: str):
        self.db.bot_settings.update_one(
            {"user_id": str(user_id), "key": key},
            {"$set": {"value": value, "updated_at": datetime.utcnow()}},
            upsert=True
        )

    def get_setting(self, user_id: str, key: str, default: str = None) -> Optional[str]:
        s = self.db.bot_settings.find_one({"user_id": str(user_id), "key": key})
        return s['value'] if s else default

    # ─────────────────── USER MANAGEMENT ───────────────────
    def create_user(self, username: str, hashed_password: str, is_admin: bool = False) -> UserInDB:
        if not is_admin:
            is_admin = self.db.users.count_documents({}) == 0
            
        user = UserInDB(
            _id="",
            username=username,
            hashed_password=hashed_password,
            is_admin=is_admin,
            is_bot_running=False,
            trading_capital=10.0,
            risk_per_trade=1.0,
            max_sl_usd=0.6,
            min_tp_usd=0.4,
            max_tp_usd=1.0
        )
        doc = self._obj_to_dict(user)
        res = self.db.users.insert_one(doc)
        doc['_id'] = str(res.inserted_id)
        return UserInDB(**doc)

    def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        u = self.db.users.find_one({"username": username})
        if u:
            u['_id'] = str(u['_id'])
            return UserInDB(**u)
        return None

    def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        try:
            u = self.db.users.find_one({"_id": ObjectId(user_id)})
            if u:
                u['_id'] = str(u['_id'])
                return UserInDB(**u)
        except Exception:
            pass
        return None

    def get_all_active_users(self) -> List[UserInDB]:
        # Fetch all users. We can filter by is_bot_running=True if we want only those currently trading.
        docs = list(self.db.users.find({}))
        for d in docs: d['_id'] = str(d['_id'])
        return [UserInDB(**d) for d in docs]

    def update_user_api_keys(self, user_id: str, enc_key: str, enc_secret: str, webhook: str = None):
        update_data = {}
        if enc_key is not None: update_data["encrypted_api_key"] = enc_key
        if enc_secret is not None: update_data["encrypted_api_secret"] = enc_secret
        if webhook is not None: update_data["discord_webhook"] = webhook
        
        if update_data:
            self.db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

    def update_user_bot_status(self, user_id: str, running: bool):
        self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_bot_running": running}}
        )
        logger.info(f"User {user_id} bot status set to: {running}")

    def update_user_trading_settings(self, user_id: str, capital: float, risk: float,
                                     max_sl: float, min_tp: float, max_tp: float):
        self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "trading_capital": capital,
                "risk_per_trade": risk,
                "max_sl_usd": max_sl,
                "min_tp_usd": min_tp,
                "max_tp_usd": max_tp
            }}
        )
        logger.info(f"User {user_id} trading settings updated: Capital={capital}, Risk={risk}%, MaxSL=${max_sl}, TP=${min_tp}-${max_tp}")

db_manager = DBManager()
