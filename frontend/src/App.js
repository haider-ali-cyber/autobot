import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import logo from './logo.png';
import { 
  Shield, Settings, BarChart2, List,
  Sun, Moon, Download, Info, CheckCircle, XCircle,
  ShieldCheck, LogOut, User, Zap, Globe, Clock, TrendingUp
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://nobody110-autobot-backend.hf.space');
const API = `${BACKEND_URL}/api`;
const AUTH_API = `${BACKEND_URL}/auth`;
const WS_URL = `${BACKEND_URL.replace(/^http/, 'ws')}/ws`;

axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ─────────────────── UTILS ───────────────────

const playSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
    } else {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.1);
    }
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
};

// ─────────────────── COMPONENTS ───────────────────

function ThemeToggle({ theme, toggle }) {
  return (
    <button onClick={toggle} className="btn btn-gray" style={{ padding: '8px' }}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function Toast({ message, type, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;
  const color = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)';
  return (
    <div className="toast">
      <Icon size={20} color={color} />
      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{message}</div></div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
        <XCircle size={14} />
      </button>
    </div>
  );
}

// ─────────────────── AUTH VIEWS ───────────────────

function AuthPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await axios.post(`${AUTH_API}/register`, null, { params: { username, password } });
        setIsRegister(false);
        alert("Registered! Now login.");
      } else {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        const resp = await axios.post(`${AUTH_API}/token`, formData);
        onLogin(resp.data.access_token, username);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: 400, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>CryptoAuto Pilot</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{isRegister ? 'Join the fleet' : 'Welcome back, Captain'}</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div style={{ color: 'var(--error)', fontSize: 12 }}>{error}</div>}
          <button className="btn btn-blue" disabled={loading} style={{ height: 48, fontSize: 16 }}>
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13 }}>
          <button onClick={() => setIsRegister(!isRegister)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── MAIN APP ───────────────────

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(localStorage.getItem('username'));
  const [tab, setTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [prices, setPrices] = useState({});
  const [botStatus, setBotStatus] = useState({});
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [pnlHistory, setPnlHistory] = useState([]);
  const [drawdown, setDrawdown] = useState({});
  const [marketData, setMarketData] = useState({ 
    news: [], 
    sessions: [], 
    sentiment: { score: 0, label: 'Neutral', percentage: 50 } 
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState({
      is_bot_running: false,
      trading_capital: 10.0,
      risk_per_trade: 1.0,
      max_sl_usd: 0.6,
      min_tp_usd: 0.4,
      max_tp_usd: 1.0,
      max_open_trades: 100,
      paper_trading: true,
      discord_webhook: '',
      bybit_api_key: '',
      bybit_api_secret: '',
      has_api_keys: false,
      is_admin: false,
  });

  const [manualTrade, setManualTrade] = useState({ symbol: '', side: 'Buy', usdt: 0, leverage: 1, sl: 0, tp: 0 });
  const [loadingManual, setLoadingManual] = useState(false);

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUser(null);
  };

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const get = (url) => axios.get(url, axiosConfig).then(r => r.data).catch(() => null);
      const [tArr, sArr, pObj, bObj, posArr, phArr, drObj, settObj] = await Promise.all([
        get(`${API}/trades`), get(`${API}/signals`), get(`${API}/prices`), 
        get(`${API}/status`), get(`${API}/positions`), get(`${API}/pnl-history`), 
        get(`${API}/drawdown`), get(`${API}/settings`)
      ]);
      if (tArr) setTrades(tArr);
      if (sArr) setSignals(sArr);
      if (pObj) setPrices(pObj);
      if (bObj) setBotStatus(bObj);
      if (posArr) setPositions(posArr);
      if (phArr) setPnlHistory(phArr);
      if (drObj) setDrawdown(drObj);
      if (settObj) setSettings(prev => ({...prev, ...settObj}));
      
      const mData = await get(`${API}/market/news`);
      if (mData) setMarketData(prev => ({...prev, ...mData}));
    } catch (e) {}
  }, [token, axiosConfig]);

  useEffect(() => { loadData(); }, [loadData]);

  // Periodic data refresh every 30 seconds
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [token, loadData]);

  // Web Socket with Token
  const ws = useRef(null);
  useEffect(() => {
    if (!token) return;
    const connect = () => {
        ws.current = new WebSocket(`${WS_URL}?token=${token}`);
        ws.current.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            setWsConnected(true);
            if (msg.type === 'status') setBotStatus(msg.data);
            if (msg.type === 'positions') setPositions(msg.data);
            if (msg.type === 'prices') setPrices(msg.data);
            if (msg.type === 'trade_opened') {
                addToast(`Trade Opened: ${msg.data.data?.symbol || msg.data.symbol}`, 'success');
                playSound('success');
                loadData();
            }
            if (msg.type === 'trade_closed') {
                const d = msg.data.data || msg.data;
                addToast(`Trade Closed: ${d.symbol} PnL: $${(d.pnl || 0).toFixed(2)}`, (d.pnl || 0) >= 0 ? 'success' : 'error');
                playSound((d.pnl || 0) >= 0 ? 'success' : 'error');
                loadData();
            }
        };
        ws.current.onclose = () => {
            setWsConnected(false);
            setTimeout(connect, 3000);
        };
    };
    connect();
    return () => ws.current?.close();
  }, [token, addToast, loadData]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (!token) return <AuthPage onLogin={(t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('username', u);
    setToken(t);
    setUser(u);
  }} />;

  const stats = {
    totalPnl: botStatus.total_pnl || 0,
    winRate: botStatus.win_rate || 0,
    dailyPnl: botStatus.daily_pnl || 0,
    openCount: positions.length,
    totalTrades: botStatus.total_trades || 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="header" style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'var(--primary-gradient)', borderRadius: 10, padding: 8, display: 'flex' }}>
            <img src={logo} alt="Logo" style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Captain {user}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Engine: <span style={{ color: settings.is_bot_running ? 'var(--success)' : 'var(--error)' }}>
                {settings.is_bot_running ? 'Active' : 'Standby'}
              </span>
              <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: 'var(--primary-gradient)', borderRadius: 20, color: 'white', fontWeight: 800 }}>
                ⚡ Fast Mode (10Hz)
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: wsConnected ? 'var(--success)' : 'var(--error)' }}>
            <div className={wsConnected ? 'pulse' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            {wsConnected ? 'Cloud Sync' : 'Offline'}
          </div>
          <ThemeToggle theme={theme} toggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          <button onClick={logout} className="btn btn-gray" style={{ padding: 8 }} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0', maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 4 }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
          { id: 'history', label: 'History', icon: List },
          { id: 'settings', label: 'My Account', icon: User },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total PnL</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: stats.totalPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>${stats.totalPnl.toFixed(2)}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Open Positions</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.openCount}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Daily Profit</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: stats.dailyPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>${stats.dailyPnl.toFixed(2)}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Win Rate</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{stats.winRate}%</div>
              </div>
            </div>

            {/* P&L Chart */}
            {pnlHistory.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Cumulative P&L</h3>
                  <div style={{ fontSize: 12, color: drawdown.max_drawdown > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                    Max Drawdown: <strong>${(drawdown.max_drawdown || 0).toFixed(2)}</strong>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={pnlHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} tickFormatter={v => `$${v.toFixed(1)}`} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`$${v.toFixed(2)}`, 'Cumulative PnL']} />
                    <Area type="monotone" dataKey="cumulative" stroke="var(--success)" strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Manual Trade Entry */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={16} color="var(--primary)" /> Manual Trade Entry
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 10 }}>Symbol</label>
                      <select value={manualTrade.symbol} onChange={e => setManualTrade({...manualTrade, symbol: e.target.value})}>
                        <option value="">Select Coin</option>
                        {Object.keys(prices).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10 }}>Side</label>
                      <select value={manualTrade.side} onChange={e => setManualTrade({...manualTrade, side: e.target.value})}>
                        <option value="Buy">BUY / LONG</option>
                        <option value="Sell">SELL / SHORT</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10 }}>Margin (USDT)</label>
                      <input type="number" step="1" value={manualTrade.usdt || ''} onChange={e => setManualTrade({...manualTrade, usdt: parseFloat(e.target.value) || 0})} placeholder="$ Mgn" />
                    </div>
                    <div>
                      <label style={{ fontSize: 10 }}>Leverage (x)</label>
                      <input type="number" step="1" value={manualTrade.leverage || ''} onChange={e => setManualTrade({...manualTrade, leverage: parseFloat(e.target.value) || 1})} placeholder="Lvg" />
                    </div>
                    <div>
                      <label style={{ fontSize: 10 }}>Stop Loss</label>
                      <input type="number" step="0.001" value={manualTrade.sl} onChange={e => setManualTrade({...manualTrade, sl: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10 }}>Take Profit</label>
                      <input type="number" step="0.001" value={manualTrade.tp} onChange={e => setManualTrade({...manualTrade, tp: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <button className={`btn ${manualTrade.side === 'Buy' ? 'btn-blue' : 'btn-red'}`} 
                    disabled={loadingManual || !manualTrade.symbol}
                    style={{ marginTop: 16, width: '100%', height: 40, fontWeight: 700 }}
                    onClick={async () => {
                      setLoadingManual(true);
                      try {
                        await axios.post(`${API}/trade/manual`, {
                          symbol: manualTrade.symbol,
                          side: manualTrade.side,
                          usdt: manualTrade.usdt,
                          leverage: manualTrade.leverage,
                          stop_loss: manualTrade.sl,
                          take_profit: manualTrade.tp
                        }, axiosConfig);
                        addToast(`Manual ${manualTrade.side} executed!`, 'success');
                        loadData();
                      } catch (e) {
                        addToast(e.response?.data?.detail || 'Manual trade failed', 'error');
                      } finally {
                        setLoadingManual(false);
                      }
                    }}>
                    {loadingManual ? 'Executing...' : `Execute Manual ${manualTrade.side} Order`}
                  </button>
                </div>

                {/* Active Trades */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Active Trades</h3>
                  {positions.length === 0 ? <p style={{color: 'var(--text-muted)', fontSize: 12}}>No open trades</p> : (
                    <table>
                      <thead>
                        <tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Current</th><th>PnL</th><th>SL</th><th>TP</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {positions.map(p => (
                          <tr key={p.id}>
                            <td style={{fontWeight: 700}}>{p.symbol}</td>
                            <td><span className={`badge badge-${p.side === 'Buy' ? 'green' : 'red'}`}>{p.side}</span></td>
                            <td>${(p.entry_price || 0).toFixed(4)}</td>
                            <td>${(p.current_price || 0).toFixed(4)}</td>
                            <td style={{color: p.pnl >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 600}}>${(p.pnl || 0).toFixed(2)}</td>
                            <td style={{color: 'var(--error)', fontSize: 11}}>${(p.stop_loss || 0).toFixed(4)}</td>
                            <td style={{color: 'var(--success)', fontSize: 11}}>${(p.take_profit || 0).toFixed(4)}</td>
                            <td>
                              <button className="btn btn-red" style={{padding: '4px 10px', fontSize: 12}} onClick={async () => {
                                try {
                                  await axios.post(`${API}/trade/close`, { trade_id: p.id }, axiosConfig);
                                  addToast(`Closing ${p.symbol}...`, 'info');
                                  setTimeout(loadData, 1000);
                                } catch(e) { addToast('Close failed', 'error'); }
                              }}>Close</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Market Prices */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Market Prices</h3>
                  {Object.keys(prices).length === 0 ? <p style={{color: 'var(--text-muted)', fontSize: 12}}>Loading prices...</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {Object.entries(prices).map(([sym, t]) => {
                        const change = t.change_24h || 0;
                        return (
                          <div key={sym} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{sym.replace('USDT','')}</div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>${(t.last_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</div>
                            <div style={{ fontSize: 11, color: change >= 0 ? 'var(--success)' : 'var(--error)' }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Sentiment Meter */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} color="var(--primary)" /> Market Sentiment
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: marketData?.sentiment?.label === 'Bullish' ? 'var(--success)' : marketData?.sentiment?.label === 'Bearish' ? 'var(--error)' : 'var(--primary)' }}>
                      {marketData?.sentiment?.percentage || 50}%
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {marketData?.sentiment?.label || 'Neutral'} Feed
                    </div>
                    <div className="gauge-container" style={{ height: 8, background: 'var(--bg)' }}>
                      <div className="gauge-fill" style={{ 
                        width: `${marketData?.sentiment?.percentage || 50}%`, 
                        background: marketData?.sentiment?.label === 'Bullish' ? 'var(--success)' : marketData?.sentiment?.label === 'Bearish' ? 'var(--error)' : 'var(--primary)' 
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                      {marketData?.sentiment?.label === 'Bearish' ? '⚠️ Long trades are currently filtered.' : '✅ Market conditions optimal.'}
                    </div>
                  </div>
                </div>

                {/* Market Sessions */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="var(--primary)" /> Global Sessions (UTC)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {marketData.sessions.map(s => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ fontSize: 16 }}>{s.icon}</span>
                           <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.status === 'OPEN' ? 'Closes in' : 'Opens in'} {s.time_left_hours}h</span>
                           <span className={`badge badge-${s.is_open ? 'green' : 'gray'}`} style={{ fontSize: 9 }}>{s.status}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* News Feed */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={16} color="var(--primary)" /> Real-time Market News
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
                    {marketData.news.length === 0 ? <p style={{fontSize: 12, color: 'var(--text-muted)'}}>Connecting to feeds...</p> : 
                      marketData.news.map((n, i) => (
                        <a key={i} href={n.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="news-item" style={{ borderLeft: '3px solid var(--primary)', paddingLeft: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>{n.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                              <span>{n.source}</span>
                              <span>{n.published}</span>
                            </div>
                          </div>
                        </a>
                      ))
                    }
                  </div>
                </div>

                {/* Bot Controls */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Bot Controls</span>
                    <span className={`badge ${botStatus.running ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10, padding: '4px 8px' }}>
                      {botStatus.running ? '🟢 ACTIVE' : '🔴 STOPPED'}
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button className="btn btn-blue" style={{flex: 1}} onClick={async () => {
                      try { await axios.post(`${API}/bot/start`, {}, axiosConfig); addToast('Bot started!', 'success'); loadData(); }
                      catch(e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
                    }}>Activate Bot</button>
                    <button className="btn btn-gray" style={{flex: 1, minWidth: '45%'}} onClick={async () => {
                      try { await axios.post(`${API}/bot/stop`, {}, axiosConfig); addToast('Bot in standby', 'info'); loadData(); }
                      catch(e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
                    }}>Pause Bot</button>
                    <button className="btn btn-red" style={{width: '100%', fontWeight: 700, background: 'var(--error-gradient)'}} onClick={async () => {
                      if (window.confirm("⚠️ EMERGENCY: Stop bot and close ALL open trades immediately?")) {
                        try { await axios.post(`${API}/bot/emergency-stop`, {}, axiosConfig); addToast('ALL TRADES CLOSED', 'error'); loadData(); }
                        catch(e) { addToast('Emergency stop failed', 'error'); }
                      }
                    }}>🚨 EMERGENCY STOP ALL</button>
                  </div>
                  <div style={{ marginTop: 16, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{color: 'var(--text-muted)'}}>Mode:</span>
                      <span style={{fontWeight: 700}}>{settings.paper_trading ? 'Paper Trading' : 'Live Trading'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{color: 'var(--text-muted)'}}>My Capital:</span>
                      <span style={{fontWeight: 700, color: 'var(--primary)'}}>${settings.trading_capital}</span>
                    </div>
                  </div>
                </div>

                {/* Live Signals */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Live Signals</h3>
                  {signals.length === 0 ? <p style={{color: 'var(--text-muted)', fontSize: 12}}>Scanning market...</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                      {signals.filter(s => s.signal !== 'NEUTRAL').map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{s.symbol.replace('USDT','')}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.strategy || 'N/A'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`badge badge-${s.signal === 'BUY' ? 'green' : 'red'}`}>{s.signal}</span>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>RSI: {(s.rsi || 0).toFixed(1)}</div>
                          </div>
                          <div style={{ width: 40 }}>
                            <div className="gauge-container">
                              <div className="gauge-fill" style={{ width: `${(s.strength || 0) * 100}%`, background: s.signal === 'BUY' ? 'var(--success)' : 'var(--error)' }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{((s.strength || 0) * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Drawdown / Risk Stats */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Risk Overview</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    {[['Peak PnL', `$${(drawdown.peak_pnl || 0).toFixed(2)}`, 'var(--success)'],
                      ['Current PnL', `$${(drawdown.current_pnl || 0).toFixed(2)}`, (drawdown.current_pnl || 0) >= 0 ? 'var(--success)' : 'var(--error)'],
                      ['Max Drawdown', `$${(drawdown.max_drawdown || 0).toFixed(2)}`, 'var(--error)'],
                      ['Current DD', `$${(drawdown.current_drawdown || 0).toFixed(2)}`, 'var(--warning)'],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{val}</span>
                      </div>
                    ))}
                    {drawdown.max_drawdown > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Drawdown from peak</div>
                        <div className="gauge-container">
                          <div className="gauge-fill" style={{ width: `${Math.min(((drawdown.current_drawdown || 0) / Math.max(drawdown.max_drawdown, 0.01)) * 100, 100)}%`, background: 'var(--error)' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Info */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, background: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 8 }}>
                    <Shield size={16} color="var(--primary)" />
                    <span>API keys stored securely in local database.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (() => {
            const closed = trades.filter(t => t.status === 'closed');
            return (
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Closed Trades ({closed.length})</h3>
                  {closed.length > 0 && (
                    <button className="btn btn-gray" style={{ padding: '6px 12px', fontSize: 12 }} onClick={async () => {
                      try {
                        const resp = await axios.get(`${API}/trades/export`, { ...axiosConfig, responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([resp.data]));
                        const a = document.createElement('a');
                        a.href = url; a.download = 'trades.csv'; a.click();
                        window.URL.revokeObjectURL(url);
                      } catch(e) { addToast('Export failed', 'error'); }
                    }}><Download size={14} /> Export CSV</button>
                  )}
                </div>
                {closed.length === 0 ? <p style={{color: 'var(--text-muted)', fontSize: 12}}>No closed trades yet</p> : (
                <table>
                    <thead>
                        <tr><th>Closed</th><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>PnL</th><th>Reason</th><th>Strategy</th></tr>
                    </thead>
                    <tbody>
                        {closed.map(t => (
                            <tr key={t.id}>
                                <td style={{fontSize: 11}}>{t.closed_at ? new Date(t.closed_at).toLocaleString() : '-'}</td>
                                <td style={{fontWeight: 700}}>{t.symbol}</td>
                                <td><span className={`badge badge-${t.side === 'Buy' ? 'green' : 'red'}`}>{t.side}</span></td>
                                <td style={{fontSize: 12}}>${(t.entry_price || 0).toFixed(4)}</td>
                                <td style={{fontSize: 12}}>${(t.exit_price || 0).toFixed(4)}</td>
                                <td style={{color: (t.pnl || 0) >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 600}}>${(t.pnl || 0).toFixed(2)}</td>
                                <td style={{fontSize: 11}}><span className={`badge badge-${t.close_reason === 'tp_hit' ? 'green' : t.close_reason === 'sl_hit' ? 'red' : 'gray'}`}>{t.close_reason || '-'}</span></td>
                                <td style={{fontSize: 11, color: 'var(--text-muted)'}}>{t.strategy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
            );
        })()}

        {tab === 'settings' && (
           <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

             {/* API Keys & Notifications */}
             <div className="card">
               <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                 <Settings size={18} color="var(--primary)" /> API Keys & Notifications
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                 <div>
                   <label>Bybit API Key</label>
                   <input type="text" placeholder={settings.has_api_keys ? '••••••••••••••••' : 'Paste your Bybit API Key'}
                     value={settings.bybit_api_key || ''} onChange={e => setSettings({...settings, bybit_api_key: e.target.value})} />
                 </div>
                 <div>
                   <label>Bybit API Secret</label>
                   <input type="password" placeholder={settings.has_api_keys ? '••••••••••••••••' : 'Paste your Bybit API Secret'}
                     value={settings.bybit_api_secret || ''} onChange={e => setSettings({...settings, bybit_api_secret: e.target.value})} />
                 </div>
                 <div>
                    <label>Discord Webhook URL</label>
                    <input type="text" placeholder="https://discord.com/api/webhooks/..."
                      value={settings.discord_webhook || ''} 
                      onChange={e => setSettings({...settings, discord_webhook: e.target.value})} />
                  </div>
                  <button className="btn btn-blue" style={{ height: 44 }} onClick={async () => {
                   try {
                     await axios.post(`${API}/settings`, {
                       trading_capital: settings.trading_capital,
                       risk_per_trade: settings.risk_per_trade,
                       max_sl_usd: settings.max_sl_usd,
                       min_tp_usd: settings.min_tp_usd,
                       max_tp_usd: settings.max_tp_usd,
                       max_open_trades: settings.max_open_trades,
                       paper_trading: settings.paper_trading,
                       discord_webhook: settings.discord_webhook,
                       bybit_api_key: settings.bybit_api_key,
                       bybit_api_secret: settings.bybit_api_secret
                     }, axiosConfig);
                     addToast('Settings saved!', 'success');
                     loadData();
                   } catch (e) {
                     addToast(e.response?.data?.detail || 'Error saving settings', 'error');
                   }
                 }}>Save Account & Trading Settings</button>
               </div>
             </div>

             {/* Trading Parameters (Available to All) */}
             <div className="card">
               <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                 <Zap size={18} color="var(--primary)" /> Bot: Trading Parameters
               </h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <div>
                   <label>Trading Capital ($)</label>
                   <input type="number" step="10" min="10" 
                     value={settings.trading_capital}
                     onChange={e => setSettings({...settings, trading_capital: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label>Risk Per Trade (%)</label>
                   <input type="number" step="0.1" min="0.1" max="100"
                     value={settings.risk_per_trade}
                     onChange={e => setSettings({...settings, risk_per_trade: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label>Max Stop Loss ($)</label>
                   <input type="number" step="0.1" min="0.1" max="100"
                     value={settings.max_sl_usd}
                     onChange={e => setSettings({...settings, max_sl_usd: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label>Min Take Profit ($)</label>
                   <input type="number" step="0.1" min="0.1" max="100"
                     value={settings.min_tp_usd}
                     onChange={e => setSettings({...settings, min_tp_usd: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label>Max Take Profit ($)</label>
                   <input type="number" step="0.1" min="0.1" max="100"
                     value={settings.max_tp_usd}
                     onChange={e => setSettings({...settings, max_tp_usd: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label>Max Open Trades</label>
                   <input type="number" step="1" min="1" max="500"
                     value={settings.max_open_trades}
                     onChange={e => setSettings({...settings, max_open_trades: parseInt(e.target.value)})} />
                 </div>
               </div>
               <div style={{ marginTop: 20 }}>
                 <label className="checkbox-container" style={{ fontSize: 13, fontWeight: 600 }}>
                   <input type="checkbox" checked={settings.paper_trading} 
                     onChange={e => setSettings({...settings, paper_trading: e.target.checked})} />
                   <span className="checkmark" /> Use Paper Trading Mode (Safety Always First)
                 </label>
               </div>
               <div className="info-box" style={{ marginTop: 16, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: 8, padding: 12, fontSize: 12 }}>
                 <Info size={14} style={{ marginRight: 6 }} /> 
                 Your capital and risk settings apply only to your trades. The bot will manage positions within these bounds to maximize profit.
               </div>
             </div>
           </div>
        )}
      </div>

      <div className="notifications-container">
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onRemove={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />)}
      </div>
    </div>
  );
}
