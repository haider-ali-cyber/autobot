import csv
import io
import json
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime
from typing import List, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base, Trade, Portfolio, Signal, BotSettings, User
from ..config import config
from ..utils.logger import logger

engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_size=10, max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


def init_db():
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


class DBManager:
    def __init__(self):
        init_db()

    # ─────────────────── TRADES ───────────────────
    def add_trade(self, user_id: int, symbol: str, side: str, entry_price: float,
                  quantity: float, stop_loss: float, take_profit: float,
                  strategy: str, order_id: str = None,
                  is_paper: bool = True) -> Trade:
        with get_session() as db:
            trade = Trade(
                user_id=user_id,
                symbol=symbol, side=side, entry_price=entry_price,
                quantity=quantity, stop_loss=stop_loss, take_profit=take_profit,
                strategy=strategy, order_id=order_id, is_paper=is_paper,
                status='open'
            )
            db.add(trade)
            db.flush()
            trade_id = trade.id
            logger.info(f"User {user_id} Trade added: {symbol} {side} @ {entry_price}")
        with get_session() as db:
            return db.query(Trade).filter(Trade.id == trade_id).first()

    def close_trade(self, trade_id: int, exit_price: float,
                    pnl: float, reason: str = 'manual'):
        with get_session() as db:
            trade = db.query(Trade).filter(Trade.id == trade_id).first()
            if trade:
                trade.exit_price = exit_price
                trade.pnl = round(pnl, 4)
                if trade.entry_price and trade.quantity:
                    trade.pnl_percent = round(
                        (pnl / (trade.entry_price * trade.quantity)) * 100, 2
                    )
                trade.status = 'closed'
                trade.close_reason = reason
                trade.closed_at = datetime.utcnow()
                logger.info(f"Trade closed: ID={trade_id} PnL=${pnl:.4f} reason={reason}")

    def get_open_trades(self, user_id: Optional[int] = None) -> List[Trade]:
        with get_session() as db:
            query = db.query(Trade).filter(Trade.status == 'open')
            if user_id is not None:
                query = query.filter(Trade.user_id == user_id)
            trades = query.all()
            db.expunge_all()
            return trades

    def get_open_trade_by_symbol(self, user_id: int, symbol: str) -> Optional[Trade]:
        with get_session() as db:
            trade = db.query(Trade).filter(
                Trade.user_id == user_id,
                Trade.symbol == symbol, 
                Trade.status == 'open'
            ).first()
            if trade:
                db.expunge(trade)
            return trade

    def get_trade_history(self, user_id: int, limit: int = 100) -> List[Trade]:
        with get_session() as db:
            trades = db.query(Trade).filter(Trade.user_id == user_id).order_by(
                Trade.created_at.desc()
            ).limit(limit).all()
            db.expunge_all()
            return trades

    def count_open_trades(self, user_id: Optional[int] = None) -> int:
        with get_session() as db:
            query = db.query(Trade).filter(Trade.status == 'open')
            if user_id is not None:
                query = query.filter(Trade.user_id == user_id)
            return query.count()

    def get_daily_pnl(self, user_id: Optional[int] = None) -> float:
        today = datetime.utcnow().date()
        with get_session() as db:
            query = db.query(Trade).filter(
                Trade.status == 'closed',
                Trade.closed_at >= today
            )
            if user_id is not None:
                query = query.filter(Trade.user_id == user_id)
            trades = query.all()
            return round(sum(t.pnl or 0 for t in trades), 4)

    # ─────────────────── SIGNALS ───────────────────
    def save_signal(self, symbol: str, signal_type: str, strength: float,
                    strategy: str, indicators: dict,
                    candle_pattern: str = None, acted_on: bool = False) -> Signal:
        with get_session() as db:
            import math
            safe_indicators = {
                k: (0 if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v)
                for k, v in indicators.items()
            }
            signal = Signal(
                symbol=symbol, signal_type=signal_type, strength=strength,
                strategy=strategy, indicators=json.dumps(safe_indicators),
                candle_pattern=candle_pattern, acted_on=acted_on
            )
            db.add(signal)
            return signal

    # ─────────────────── PORTFOLIO ───────────────────
    def update_portfolio(self, total_balance: float, available_balance: float,
                         unrealized_pnl: float, realized_pnl: float):
        with get_session() as db:
            closed_trades = db.query(Trade).filter(Trade.status == 'closed').all()
            wins = len([t for t in closed_trades if (t.pnl or 0) > 0])
            total = len(closed_trades)
            portfolio = Portfolio(
                total_balance=total_balance,
                available_balance=available_balance,
                unrealized_pnl=unrealized_pnl,
                realized_pnl=realized_pnl,
                total_trades=total,
                winning_trades=wins,
                losing_trades=total - wins,
                win_rate=round((wins / total * 100) if total > 0 else 0, 2)
            )
            db.add(portfolio)

    # ─────────────────── STATS ───────────────────
    def get_stats(self, user_id: int) -> dict:
        with get_session() as db:
            closed = db.query(Trade).filter(Trade.user_id == user_id, Trade.status == 'closed').all()
            total = len(closed)
            wins = len([t for t in closed if (t.pnl or 0) > 0])
            total_pnl = sum(t.pnl or 0 for t in closed)
            open_count = db.query(Trade).filter(Trade.user_id == user_id, Trade.status == 'open').count()
        daily = self.get_daily_pnl(user_id)
        return {
            'total_trades': total,
            'winning_trades': wins,
            'losing_trades': total - wins,
            'win_rate': round((wins / total * 100) if total > 0 else 0, 2),
            'total_pnl': round(total_pnl, 4),
            'avg_pnl': round(total_pnl / total if total > 0 else 0, 4),
            'open_trades': open_count,
            'daily_pnl': daily,
        }

    # ─────────────────── PNL HISTORY (Phase 2) ───────────────────
    def get_pnl_history(self, user_id: int, days: int = 30) -> list:
        """Returns daily PnL time-series for charts."""
        with get_session() as db:
            closed = db.query(Trade).filter(Trade.user_id == user_id, Trade.status == 'closed').order_by(Trade.closed_at.asc()).all()

        daily = defaultdict(float)
        for t in closed:
            if t.closed_at:
                day_key = t.closed_at.strftime('%Y-%m-%d')
                daily[day_key] += (t.pnl or 0)

        # Build cumulative series
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

    def get_drawdown_stats(self, user_id: int) -> dict:
        """Compute max drawdown and current drawdown for a user."""
        with get_session() as db:
            closed = db.query(Trade).filter(Trade.user_id == user_id, Trade.status == 'closed').order_by(Trade.closed_at.asc()).all()

        if not closed:
            return {'max_drawdown': 0, 'current_drawdown': 0, 'peak_pnl': 0, 'current_pnl': 0}

        cumulative = 0.0
        peak = 0.0
        max_dd = 0.0
        for t in closed:
            cumulative += (t.pnl or 0)
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

    def export_trades_csv(self, user_id: int) -> str:
        """Export all trades for a user as CSV string."""
        with get_session() as db:
            trades = db.query(Trade).filter(Trade.user_id == user_id).order_by(Trade.created_at.desc()).all()
            db.expunge_all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Symbol', 'Side', 'Entry', 'Exit', 'Qty',
                         'SL', 'TP', 'PnL', 'PnL%', 'Status', 'Strategy',
                         'Reason', 'Paper', 'Opened', 'Closed'])
        for t in trades:
            writer.writerow([
                t.id, t.symbol, t.side, t.entry_price, t.exit_price,
                t.quantity, t.stop_loss, t.take_profit, t.pnl,
                t.pnl_percent, t.status, t.strategy, t.close_reason,
                t.is_paper,
                t.created_at.isoformat() if t.created_at else '',
                t.closed_at.isoformat() if t.closed_at else '',
            ])
        return output.getvalue()

    # ─────────────────── AUDIT LOG (Phase 2) ───────────────────
    def log_audit(self, user_id: int, action: str, details: str = ''):
        """Save audit entry for a specific user."""
        key = f"audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{action}"
        self.set_setting(user_id, key, details)

    # ─────────────────── SETTINGS ───────────────────
    def set_setting(self, user_id: int, key: str, value: str):
        with get_session() as db:
            setting = db.query(BotSettings).filter(BotSettings.user_id == user_id, BotSettings.key == key).first()
            if setting:
                setting.value = value
                setting.updated_at = datetime.utcnow()
            else:
                db.add(BotSettings(user_id=user_id, key=key, value=value))

    def get_setting(self, user_id: int, key: str, default: str = None) -> Optional[str]:
        with get_session() as db:
            setting = db.query(BotSettings).filter(BotSettings.user_id == user_id, BotSettings.key == key).first()
            return setting.value if setting else default

    # ─────────────────── USER MANAGEMENT (Phase 3) ───────────────────
    def create_user(self, username: str, hashed_password: str, is_admin: bool = False) -> User:
        with get_session() as db:
            # First user is automatically admin
            if not is_admin:
                is_admin = db.query(User).count() == 0
            user = User(username=username, hashed_password=hashed_password, is_admin=is_admin)
            db.add(user)
            db.flush()
            user_id = user.id
        with get_session() as db:
            return db.query(User).filter(User.id == user_id).first()

    def get_user_by_username(self, username: str) -> Optional[User]:
        with get_session() as db:
            user = db.query(User).filter(User.username == username).first()
            if user:
                db.expunge(user)
            return user

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        with get_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.expunge(user)
            return user

    def get_all_active_users(self) -> List[User]:
        with get_session() as db:
            users = db.query(User).filter(User.is_active == True).all()
            db.expunge_all()
            return users

    def update_user_api_keys(self, user_id: int, enc_key: str, enc_secret: str, webhook: str = None):
        with get_session() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                if enc_key is not None:
                    user.encrypted_api_key = enc_key or None
                if enc_secret is not None:
                    user.encrypted_api_secret = enc_secret or None
                if webhook is not None:
                    user.discord_webhook = webhook or None



db_manager = DBManager()
