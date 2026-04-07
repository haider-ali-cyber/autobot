# 🤖 Auto Crypto Trading Bot

A powerful automated cryptocurrency trading bot with AI-powered analysis, real-time dashboard, and advanced risk management.

## ⚡ Quick Start

### Option A: One-click launcher
```
Double-click: start_bot.bat
```

### Option B: Manual (if bat file fails)
```powershell
# Terminal 1 - Backend
.\venv\Scripts\python.exe run.py

# Terminal 2 - Frontend
cd frontend
npm.cmd start
```

### Step 2: Add your API keys
Edit the `.env` file:
```
BYBIT_API_KEY=your_key_here
BYBIT_API_SECRET=your_secret_here
BYBIT_TESTNET=true        # true = testnet, false = real trading
PAPER_TRADING=true        # true = no real money
```

### Step 3: Open Dashboard
- **Dashboard:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

> **Note for Pakistan users:** pip uses USTC mirror automatically (configured at `%APPDATA%\pip\pip.ini`). pypi.org is blocked by ISP but Bybit API works fine.

---

## 🎯 Features

### Trading
- 20 top coins monitored simultaneously (BTC, ETH, SOL, BNB, ADA, etc.)
- Futures/Perpetual trading via Bybit API
- 100+ simultaneous trades capacity
- Auto trade open & close
- Multiple entry strategies

### Technical Analysis
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- EMA/SMA (9, 21, 50, 200)
- ATR (Average True Range)
- Stochastic RSI
- VWAP
- Fibonacci Levels
- Support & Resistance

### Candlestick Patterns (18 patterns)
- Hammer / Inverted Hammer
- Shooting Star / Hanging Man
- Doji (Regular, Dragonfly, Gravestone)
- Bullish/Bearish Engulfing
- Morning Star / Evening Star
- Bullish/Bearish Harami
- Piercing Line / Dark Cloud Cover
- Three White Soldiers / Three Black Crows
- Tweezer Top / Tweezer Bottom
- Marubozu (Bullish/Bearish)

### Risk Management
- **Hard Stop Loss cap: $0.60** (auto-close at $0.60 loss)
- Take Profit range: $0.40 - $1.00
- Micro-profit strategy ($0.40, $0.60, $0.80, $1.00 levels)
- Max open trades: 100
- Daily loss limit
- Position sizing based on ATR

### Strategies
- **Combined Master** - RSI + MACD + BB + EMA + Stochastic + Patterns
- **Scalping MicroProfit** - Quick trades for $0.40-$1.00 profit

### Dashboard
- Live price ticker (real-time)
- Live prices table (all 20 coins)
- Bot status & controls (Start/Stop)
- Open positions with PnL
- Trade history
- Risk settings panel
- Signal strength indicator

---

## 📋 Requirements

### Python (Backend)
- Python 3.10+
- See `requirements.txt`

### Node.js (Frontend)
- Node.js 18+
- npm

---

## ⚙️ Manual Setup

### Backend
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

---

## 🔑 Getting Bybit API Keys

1. Go to [bybit.com](https://www.bybit.com)
2. Account → API Management → Create API
3. Enable: **Read** + **Trade** permissions
4. Copy API Key and Secret to `.env`

**Start with TESTNET first:**
- Go to [testnet.bybit.com](https://testnet.bybit.com)
- Create testnet API keys
- Set `BYBIT_TESTNET=true` in `.env`

---

## ⚠️ Risk Warning

**CRYPTOCURRENCY TRADING IS EXTREMELY RISKY.**
- Always start with Paper Trading mode
- Test on testnet before real money
- Never trade more than you can afford to lose
- This bot does not guarantee profits
- Past performance does not predict future results

---

## 🔒 Safety Features

- **Paper Trading Mode** - Test without real money
- **Testnet Support** - Practice on fake money
- **$0.60 Hard Stop Loss** - Maximum $0.60 loss per trade
- **Daily Loss Limit** - Auto-stop if daily loss exceeded
- **Max Trades Limit** - Never exceeds 100 open trades

---

## 📁 Project Structure

```
auto trade/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── config.py            # Configuration
│   ├── exchange/
│   │   ├── bybit_client.py  # Bybit API
│   │   └── data_fetcher.py  # Live data
│   ├── analysis/
│   │   ├── technical.py     # Indicators
│   │   └── candle_patterns.py # 18 patterns
│   ├── trading/
│   │   ├── risk_manager.py  # Risk control
│   │   ├── order_manager.py # Order execution
│   │   └── engine.py        # Trading brain
│   ├── strategies/
│   │   └── base_strategy.py # Trading strategies
│   └── database/
│       ├── models.py        # DB schema
│       └── db_manager.py    # DB operations
├── frontend/
│   └── src/
│       └── App.js           # React dashboard
├── .env                     # Your API keys (DO NOT SHARE)
├── .env.example             # Template
├── requirements.txt         # Python packages
├── run.py                   # Start backend
└── start_bot.bat            # Windows launcher
```
