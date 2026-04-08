import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from ..config import config


def to_dataframe(candles: List[Dict]) -> pd.DataFrame:
    df = pd.DataFrame(candles)
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna()
    return df


# ─────────────────── RSI ───────────────────
def rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


# ─────────────────── MACD ───────────────────
def macd(df: pd.DataFrame, fast: int = 12, slow: int = 26,
         signal: int = 9) -> Dict[str, pd.Series]:
    ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return {'macd': macd_line, 'signal': signal_line, 'histogram': histogram}


# ─────────────────── BOLLINGER BANDS ───────────────────
def bollinger_bands(df: pd.DataFrame, period: int = 20,
                    std: float = 2.0) -> Dict[str, pd.Series]:
    middle = df['close'].rolling(window=period).mean()
    std_dev = df['close'].rolling(window=period).std()
    upper = middle + (std_dev * std)
    lower = middle - (std_dev * std)
    bandwidth = (upper - lower) / middle
    return {'upper': upper, 'middle': middle, 'lower': lower, 'bandwidth': bandwidth}


# ─────────────────── MOVING AVERAGES ───────────────────
def ema(df: pd.DataFrame, period: int) -> pd.Series:
    return df['close'].ewm(span=period, adjust=False).mean()


def sma(df: pd.DataFrame, period: int) -> pd.Series:
    return df['close'].rolling(window=period).mean()


# ─────────────────── ATR ───────────────────
def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high_low = df['high'] - df['low']
    high_close = (df['high'] - df['close'].shift()).abs()
    low_close = (df['low'] - df['close'].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return tr.ewm(alpha=1/period, adjust=False).mean()


# ─────────────────── ADX (Phase 2) ───────────────────
def adx(df: pd.DataFrame, period: int = 14) -> Dict[str, pd.Series]:
    """Calculate ADX, +DI, and -DI for market regime detection."""
    df = df.copy()
    high, low, close = df['high'], df['low'], df['close']
    
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs()
    ], axis=1).max(axis=1)
    
    atr_val = tr.ewm(alpha=1/period, adjust=False).mean()
    
    up_move = high - high.shift()
    down_move = low.shift() - low
    
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)
    
    plus_di = 100 * (pd.Series(plus_dm).ewm(alpha=1/period, adjust=False).mean() / atr_val)
    minus_di = 100 * (pd.Series(minus_dm).ewm(alpha=1/period, adjust=False).mean() / atr_val)
    
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di)
    adx_val = dx.ewm(alpha=1/period, adjust=False).mean()
    
    return {'adx': adx_val, 'plus_di': plus_di, 'minus_di': minus_di}


# ─────────────────── STOCHASTIC RSI ───────────────────
def stoch_rsi(df: pd.DataFrame, rsi_period: int = 14,
              stoch_period: int = 14, smooth_k: int = 3,
              smooth_d: int = 3) -> Dict[str, pd.Series]:
    rsi_vals = rsi(df, rsi_period)
    min_rsi = rsi_vals.rolling(window=stoch_period).min()
    max_rsi = rsi_vals.rolling(window=stoch_period).max()
    stoch = ((rsi_vals - min_rsi) / (max_rsi - min_rsi).replace(0, np.nan)) * 100
    k = stoch.rolling(window=smooth_k).mean()
    d = k.rolling(window=smooth_d).mean()
    return {'k': k, 'd': d}


# ─────────────────── VWAP ───────────────────
def vwap(df: pd.DataFrame) -> pd.Series:
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    return (typical_price * df['volume']).cumsum() / df['volume'].cumsum()


# ─────────────────── SUPPORT / RESISTANCE ───────────────────
def support_resistance(df: pd.DataFrame, window: int = 20) -> Dict[str, float]:
    recent = df.tail(window)
    return {
        'support': float(recent['low'].min()),
        'resistance': float(recent['high'].max()),
        'mid': float((recent['low'].min() + recent['high'].max()) / 2),
    }


# ─────────────────── FIBONACCI LEVELS ───────────────────
def fibonacci_levels(df: pd.DataFrame, window: int = 50) -> Dict[str, float]:
    recent = df.tail(window)
    high = float(recent['high'].max())
    low = float(recent['low'].min())
    diff = high - low
    return {
        'level_0':   high,
        'level_236': high - 0.236 * diff,
        'level_382': high - 0.382 * diff,
        'level_500': high - 0.500 * diff,
        'level_618': high - 0.618 * diff,
        'level_786': high - 0.786 * diff,
        'level_100': low,
    }


# ─────────────────── VOLUME ANALYSIS ───────────────────
def volume_analysis(df: pd.DataFrame, period: int = 20) -> Dict[str, float]:
    avg_volume = df['volume'].rolling(window=period).mean()
    current_volume = df['volume'].iloc[-1]
    volume_ratio = current_volume / avg_volume.iloc[-1] if avg_volume.iloc[-1] > 0 else 1
    return {
        'current': float(current_volume),
        'average': float(avg_volume.iloc[-1]),
        'ratio': float(volume_ratio),
        'is_high': bool(volume_ratio > 1.5),
    }


# ─────────────────── TREND DETECTION ───────────────────
def detect_trend(df: pd.DataFrame) -> str:
    e9 = ema(df, 9).iloc[-1]
    e21 = ema(df, 21).iloc[-1]
    e200 = ema(df, 200).iloc[-1] if len(df) >= 200 else None
    close = df['close'].iloc[-1]

    if e9 > e21 and close > e21:
        if e200 and close > e200:
            return 'strong_uptrend'
        return 'uptrend'
    elif e9 < e21 and close < e21:
        if e200 and close < e200:
            return 'strong_downtrend'
        return 'downtrend'
    return 'sideways'


# ─────────────────── MARKET REGIME (Phase 2) ───────────────────
def detect_market_regime(df: pd.DataFrame) -> Dict[str, str]:
    """Detect if market is trending or ranging using ADX."""
    adx_data = adx(df)
    current_adx = adx_data['adx'].iloc[-1]
    
    if current_adx > 25:
        regime = 'trending'
    elif current_adx < 20:
        regime = 'ranging'
    else:
        regime = 'neutral'
        
    return {
        'regime': regime,
        'strength': round(float(current_adx), 2)
    }


# ─────────────────── CORRELATION (Phase 2) ───────────────────
def calculate_correlation_matrix(prices_dict: Dict[str, List[float]]) -> pd.DataFrame:
    """Calculate pearson correlation between multiple coin price series."""
    df = pd.DataFrame(prices_dict)
    return df.corr(method='pearson')


# ─────────────────── FULL ANALYSIS ───────────────────
def full_analysis(candles: List[Dict]) -> Optional[Dict]:
    if len(candles) < 40:
        return None

    df = to_dataframe(candles)
    close = df['close'].iloc[-1]

    rsi_vals = rsi(df, config.RSI_PERIOD)
    macd_vals = macd(df, config.MACD_FAST, config.MACD_SLOW, config.MACD_SIGNAL)
    bb = bollinger_bands(df, config.BB_PERIOD, config.BB_STD)
    atr_val = atr(df, config.ATR_PERIOD)
    stoch = stoch_rsi(df)
    sr = support_resistance(df)
    fib = fibonacci_levels(df)
    vol = volume_analysis(df)
    trend = detect_trend(df)
    regime_data = detect_market_regime(df)
    vwap_val = vwap(df)

    return {
        'close': close,
        'trend': trend,
        'regime': regime_data['regime'],
        'regime_strength': regime_data['strength'],
        'rsi': round(float(rsi_vals.iloc[-1]), 2),
        'rsi_prev': round(float(rsi_vals.iloc[-2]), 2),
        'macd_line': round(float(macd_vals['macd'].iloc[-1]), 6),
        'macd_signal': round(float(macd_vals['signal'].iloc[-1]), 6),
        'macd_hist': round(float(macd_vals['histogram'].iloc[-1]), 6),
        'macd_hist_prev': round(float(macd_vals['histogram'].iloc[-2]), 6),
        'bb_upper': round(float(bb['upper'].iloc[-1]), 4),
        'bb_middle': round(float(bb['middle'].iloc[-1]), 4),
        'bb_lower': round(float(bb['lower'].iloc[-1]), 4),
        'bb_bandwidth': round(float(bb['bandwidth'].iloc[-1]), 4),
        'atr': round(float(atr_val.iloc[-1]), 4),
        'stoch_k': round(float(stoch['k'].iloc[-1]), 2),
        'stoch_d': round(float(stoch['d'].iloc[-1]), 2),
        'ema9': round(float(ema(df, 9).iloc[-1]), 4),
        'ema21': round(float(ema(df, 21).iloc[-1]), 4),
        'ema50': round(float(ema(df, 50).iloc[-1]), 4),
        'vwap': round(float(vwap_val.iloc[-1]), 4),
        'support': round(sr['support'], 4),
        'resistance': round(sr['resistance'], 4),
        'fib_618': round(fib['level_618'], 4),
        'fib_382': round(fib['level_382'], 4),
        'volume_ratio': round(vol['ratio'], 2),
        'volume_high': vol['is_high'],
    }
