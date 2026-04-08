import os
from dotenv import load_dotenv
from typing import List

load_dotenv()

class Config:
    # Bybit API
    BYBIT_API_KEY: str = os.getenv('BYBIT_API_KEY', '')
    BYBIT_API_SECRET: str = os.getenv('BYBIT_API_SECRET', '')
    BYBIT_TESTNET: bool = os.getenv('BYBIT_TESTNET', 'true').lower() == 'true'
    BYBIT_DEMO: bool = os.getenv('BYBIT_DEMO', 'true').lower() == 'true'
    BYBIT_DOMAIN: str = os.getenv('BYBIT_DOMAIN', 'https://api.bybit.com')
    ENCRYPTION_KEY: str = os.getenv('ENCRYPTION_KEY', '')

    # Notifications
    DISCORD_WEBHOOK_URL: str = os.getenv('DISCORD_WEBHOOK_URL', '')
    MAX_STOP_LOSS_USD: float = float(os.getenv('MAX_STOP_LOSS_USD', 0.8))
    MIN_TAKE_PROFIT_USD: float = float(os.getenv('MIN_TAKE_PROFIT_USD', 0.4))
    MAX_TAKE_PROFIT_USD: float = float(os.getenv('MAX_TAKE_PROFIT_USD', 1.0))
    MAX_OPEN_TRADES: int = int(os.getenv('MAX_OPEN_TRADES', 100))
    INITIAL_CAPITAL: float = float(os.getenv('INITIAL_CAPITAL', 100.0))

    # Risk Management
    RISK_PER_TRADE_PERCENT: float = float(os.getenv('RISK_PER_TRADE_PERCENT', 1.0))
    MAX_DAILY_LOSS_USD: float = float(os.getenv('MAX_DAILY_LOSS_USD', 10.0))

    # Mode
    PAPER_TRADING: bool = os.getenv('PAPER_TRADING', 'true').lower() == 'true'

    # Top 5 Scalping Coins (Reliable Majors)
    TRADING_PAIRS: List[str] = [
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'
    ]

    # Technical Analysis
    RSI_PERIOD: int = 14
    RSI_OVERBOUGHT: float = 70.0
    RSI_OVERSOLD: float = 30.0
    MACD_FAST: int = 12
    MACD_SLOW: int = 26
    MACD_SIGNAL: int = 9
    BB_PERIOD: int = 20
    BB_STD: float = 2.0
    ATR_PERIOD: int = 14
    EMA_SHORT: int = 9
    EMA_LONG: int = 21
    EMA_TREND: int = 200

    # Strategy
    SIGNAL_THRESHOLD: float = 0.6
    PRIMARY_TIMEFRAME: str = '3'
    CONFIRM_TIMEFRAME: str = '60'

    # Server
    API_PORT: int = int(os.getenv('API_PORT', 8000))
    DATABASE_URL: str = 'sqlite:///./data/trading_bot.db'

    # Profit Levels (micro-profit strategy in USD)
    PROFIT_LEVELS: List[float] = [0.2, 0.3, 0.4, 0.6]

config = Config()
