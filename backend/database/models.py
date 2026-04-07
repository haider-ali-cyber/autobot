from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    
    # Encrypted API Keys (per user)
    encrypted_api_key = Column(String(200), nullable=True)
    encrypted_api_secret = Column(String(200), nullable=True)
    
    # Notifications
    discord_webhook = Column(String(200), nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    trades = relationship("Trade", back_populates="user")
    portfolio = relationship("Portfolio", back_populates="user")
    settings = relationship("BotSettings", back_populates="user")



class Trade(Base):
    __tablename__ = 'trades'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    symbol = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False)          # Buy / Sell
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    quantity = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    pnl = Column(Float, default=0.0)
    pnl_percent = Column(Float, default=0.0)
    status = Column(String(20), default='open')        # open / closed / cancelled
    strategy = Column(String(100), nullable=True)
    order_id = Column(String(100), nullable=True)
    is_paper = Column(Boolean, default=True)
    close_reason = Column(String(50), nullable=True)   # sl_hit / tp_hit / manual
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="trades")



class Portfolio(Base):
    __tablename__ = 'portfolio'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    total_balance = Column(Float, default=0.0)
    available_balance = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    daily_pnl = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="portfolio")



class Signal(Base):
    __tablename__ = 'signals'

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Signals are global (brain), but we track who acted on them
    detected_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)

    symbol = Column(String(20), nullable=False)
    signal_type = Column(String(10), nullable=False)   # BUY / SELL
    strength = Column(Float, default=0.0)              # 0.0 - 1.0
    strategy = Column(String(100), nullable=True)
    indicators = Column(Text, nullable=True)           # JSON
    candle_pattern = Column(String(100), nullable=True)
    acted_on = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class BotSettings(Base):
    __tablename__ = 'bot_settings'
    __table_args__ = (UniqueConstraint('user_id', 'key', name='uq_user_setting'),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    key = Column(String(100), nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="settings")

