from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str
    is_active: bool = True
    is_admin: bool = False
    discord_webhook: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    encrypted_api_key: Optional[str] = None
    encrypted_api_secret: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(populate_by_name=True)

class TradeModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    symbol: str
    side: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    pnl: float = 0.0
    pnl_percent: float = 0.0
    status: str = 'open'
    strategy: Optional[str] = None
    order_id: Optional[str] = None
    is_paper: bool = True
    close_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

class PortfolioModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    total_balance: float = 0.0
    available_balance: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    daily_pnl: float = 0.0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(populate_by_name=True)

class SignalModel(BaseModel):
    id: str = Field(alias="_id")
    detected_by_user_id: Optional[str] = None
    symbol: str
    signal_type: str
    strength: float = 0.0
    strategy: Optional[str] = None
    indicators: Optional[str] = None
    candle_pattern: Optional[str] = None
    acted_on: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True)

class BotSettingsModel(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    key: str
    value: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True)
