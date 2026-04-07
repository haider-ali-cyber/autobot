import pandas as pd
from typing import Dict, List, Optional
from .technical import to_dataframe


def _body(o: float, c: float) -> float:
    return abs(c - o)


def _upper_shadow(o: float, h: float, c: float) -> float:
    return h - max(o, c)


def _lower_shadow(o: float, l: float, c: float) -> float:
    return min(o, c) - l


def _range(h: float, l: float) -> float:
    return h - l


# ─────────────────── INDIVIDUAL PATTERNS ───────────────────

def is_hammer(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    lower = _lower_shadow(o, l, c)
    upper = _upper_shadow(o, h, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return (lower >= 2 * body and upper <= 0.1 * rng
            and body / rng >= 0.1)


def is_inverted_hammer(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    lower = _lower_shadow(o, l, c)
    upper = _upper_shadow(o, h, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return (upper >= 2 * body and lower <= 0.1 * rng
            and body / rng >= 0.1)


def is_shooting_star(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    lower = _lower_shadow(o, l, c)
    upper = _upper_shadow(o, h, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return (upper >= 2 * body and lower <= 0.1 * rng
            and c < o)


def is_hanging_man(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    lower = _lower_shadow(o, l, c)
    upper = _upper_shadow(o, h, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return (lower >= 2 * body and upper <= 0.1 * rng
            and c < o)


def is_doji(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return body / rng <= 0.05


def is_dragonfly_doji(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    rng = _range(h, l)
    lower = _lower_shadow(o, l, c)
    upper = _upper_shadow(o, h, c)
    if rng == 0:
        return False
    return (body / rng <= 0.05 and lower >= 0.6 * rng and upper <= 0.1 * rng)


def is_gravestone_doji(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    rng = _range(h, l)
    upper = _upper_shadow(o, h, c)
    lower = _lower_shadow(o, l, c)
    if rng == 0:
        return False
    return (body / rng <= 0.05 and upper >= 0.6 * rng and lower <= 0.1 * rng)


def is_spinning_top(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return 0.1 <= body / rng <= 0.3


def is_marubozu_bullish(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return c > o and body / rng >= 0.95


def is_marubozu_bearish(o: float, h: float, l: float, c: float) -> bool:
    body = _body(o, c)
    rng = _range(h, l)
    if rng == 0:
        return False
    return c < o and body / rng >= 0.95


# ─────────────────── TWO-CANDLE PATTERNS ───────────────────

def is_bullish_engulfing(prev: Dict, curr: Dict) -> bool:
    return (prev['close'] < prev['open'] and
            curr['close'] > curr['open'] and
            curr['open'] <= prev['close'] and
            curr['close'] >= prev['open'])


def is_bearish_engulfing(prev: Dict, curr: Dict) -> bool:
    return (prev['close'] > prev['open'] and
            curr['close'] < curr['open'] and
            curr['open'] >= prev['close'] and
            curr['close'] <= prev['open'])


def is_bullish_harami(prev: Dict, curr: Dict) -> bool:
    return (prev['close'] < prev['open'] and
            curr['close'] > curr['open'] and
            curr['open'] > prev['close'] and
            curr['close'] < prev['open'])


def is_bearish_harami(prev: Dict, curr: Dict) -> bool:
    return (prev['close'] > prev['open'] and
            curr['close'] < curr['open'] and
            curr['open'] < prev['close'] and
            curr['close'] > prev['open'])


def is_piercing_line(prev: Dict, curr: Dict) -> bool:
    mid = (prev['open'] + prev['close']) / 2
    return (prev['close'] < prev['open'] and
            curr['close'] > curr['open'] and
            curr['open'] < prev['close'] and
            curr['close'] > mid)


def is_dark_cloud_cover(prev: Dict, curr: Dict) -> bool:
    mid = (prev['open'] + prev['close']) / 2
    return (prev['close'] > prev['open'] and
            curr['close'] < curr['open'] and
            curr['open'] > prev['close'] and
            curr['close'] < mid)


def is_tweezer_top(prev: Dict, curr: Dict) -> bool:
    return (abs(prev['high'] - curr['high']) / prev['high'] < 0.001 and
            prev['close'] > prev['open'] and
            curr['close'] < curr['open'])


def is_tweezer_bottom(prev: Dict, curr: Dict) -> bool:
    return (abs(prev['low'] - curr['low']) / max(prev['low'], 0.001) < 0.001 and
            prev['close'] < prev['open'] and
            curr['close'] > curr['open'])


# ─────────────────── THREE-CANDLE PATTERNS ───────────────────

def is_morning_star(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (c1['close'] < c1['open'] and
            _body(c2['open'], c2['close']) < _body(c1['open'], c1['close']) * 0.3 and
            c3['close'] > c3['open'] and
            c3['close'] > (c1['open'] + c1['close']) / 2)


def is_evening_star(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (c1['close'] > c1['open'] and
            _body(c2['open'], c2['close']) < _body(c1['open'], c1['close']) * 0.3 and
            c3['close'] < c3['open'] and
            c3['close'] < (c1['open'] + c1['close']) / 2)


def is_three_white_soldiers(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (c1['close'] > c1['open'] and
            c2['close'] > c2['open'] and
            c3['close'] > c3['open'] and
            c2['open'] > c1['open'] and c2['close'] > c1['close'] and
            c3['open'] > c2['open'] and c3['close'] > c2['close'])


def is_three_black_crows(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (c1['close'] < c1['open'] and
            c2['close'] < c2['open'] and
            c3['close'] < c3['open'] and
            c2['open'] < c1['open'] and c2['close'] < c1['close'] and
            c3['open'] < c2['open'] and c3['close'] < c2['close'])


# ─────────────────── MASTER PATTERN DETECTOR ───────────────────

def detect_patterns(candles: List[Dict]) -> Dict:
    if len(candles) < 5:
        return {'patterns': [], 'signal': 'NEUTRAL', 'strength': 0.0}

    results = []
    bullish_score = 0.0
    bearish_score = 0.0

    c = candles[-1]
    p = candles[-2]
    p2 = candles[-3]

    o, h, l, cl = c['open'], c['high'], c['low'], c['close']

    # Single candle patterns
    if is_hammer(o, h, l, cl):
        results.append({'name': 'Hammer', 'type': 'bullish'})
        bullish_score += 0.7
    if is_inverted_hammer(o, h, l, cl):
        results.append({'name': 'Inverted Hammer', 'type': 'bullish'})
        bullish_score += 0.5
    if is_shooting_star(o, h, l, cl):
        results.append({'name': 'Shooting Star', 'type': 'bearish'})
        bearish_score += 0.8
    if is_hanging_man(o, h, l, cl):
        results.append({'name': 'Hanging Man', 'type': 'bearish'})
        bearish_score += 0.6
    if is_doji(o, h, l, cl):
        results.append({'name': 'Doji', 'type': 'neutral'})
    if is_dragonfly_doji(o, h, l, cl):
        results.append({'name': 'Dragonfly Doji', 'type': 'bullish'})
        bullish_score += 0.6
    if is_gravestone_doji(o, h, l, cl):
        results.append({'name': 'Gravestone Doji', 'type': 'bearish'})
        bearish_score += 0.6
    if is_marubozu_bullish(o, h, l, cl):
        results.append({'name': 'Bullish Marubozu', 'type': 'bullish'})
        bullish_score += 0.8
    if is_marubozu_bearish(o, h, l, cl):
        results.append({'name': 'Bearish Marubozu', 'type': 'bearish'})
        bearish_score += 0.8

    # Two-candle patterns
    if is_bullish_engulfing(p, c):
        results.append({'name': 'Bullish Engulfing', 'type': 'bullish'})
        bullish_score += 0.9
    if is_bearish_engulfing(p, c):
        results.append({'name': 'Bearish Engulfing', 'type': 'bearish'})
        bearish_score += 0.9
    if is_bullish_harami(p, c):
        results.append({'name': 'Bullish Harami', 'type': 'bullish'})
        bullish_score += 0.6
    if is_bearish_harami(p, c):
        results.append({'name': 'Bearish Harami', 'type': 'bearish'})
        bearish_score += 0.6
    if is_piercing_line(p, c):
        results.append({'name': 'Piercing Line', 'type': 'bullish'})
        bullish_score += 0.75
    if is_dark_cloud_cover(p, c):
        results.append({'name': 'Dark Cloud Cover', 'type': 'bearish'})
        bearish_score += 0.75
    if is_tweezer_bottom(p, c):
        results.append({'name': 'Tweezer Bottom', 'type': 'bullish'})
        bullish_score += 0.7
    if is_tweezer_top(p, c):
        results.append({'name': 'Tweezer Top', 'type': 'bearish'})
        bearish_score += 0.7

    # Three-candle patterns
    if is_morning_star(p2, p, c):
        results.append({'name': 'Morning Star', 'type': 'bullish'})
        bullish_score += 0.95
    if is_evening_star(p2, p, c):
        results.append({'name': 'Evening Star', 'type': 'bearish'})
        bearish_score += 0.95
    if is_three_white_soldiers(p2, p, c):
        results.append({'name': 'Three White Soldiers', 'type': 'bullish'})
        bullish_score += 1.0
    if is_three_black_crows(p2, p, c):
        results.append({'name': 'Three Black Crows', 'type': 'bearish'})
        bearish_score += 1.0

    # Determine final signal
    if bullish_score > bearish_score and bullish_score >= 0.6:
        signal = 'BUY'
        strength = min(bullish_score / 2.0, 1.0)
    elif bearish_score > bullish_score and bearish_score >= 0.6:
        signal = 'SELL'
        strength = min(bearish_score / 2.0, 1.0)
    else:
        signal = 'NEUTRAL'
        strength = 0.0

    top_pattern = results[0]['name'] if results else None

    return {
        'patterns': results,
        'signal': signal,
        'strength': round(strength, 3),
        'bullish_score': round(bullish_score, 3),
        'bearish_score': round(bearish_score, 3),
        'top_pattern': top_pattern,
    }
