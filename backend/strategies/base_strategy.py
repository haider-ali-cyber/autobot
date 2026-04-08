from abc import ABC, abstractmethod
from typing import Dict, Optional, List
from enum import Enum


class SignalType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    NEUTRAL = "NEUTRAL"


class Signal:
    def __init__(self, signal_type: SignalType, strength: float,
                 strategy_name: str, reasons: List[str],
                 indicators: Dict, candle_pattern: str = None):
        self.signal_type = signal_type
        self.strength = round(min(max(strength, 0.0), 1.0), 3)
        self.strategy_name = strategy_name
        self.reasons = reasons
        self.indicators = indicators
        self.candle_pattern = candle_pattern

    def to_dict(self) -> Dict:
        return {
            'signal': self.signal_type.value,
            'strength': self.strength,
            'strategy': self.strategy_name,
            'reasons': self.reasons,
            'indicators': self.indicators,
            'candle_pattern': self.candle_pattern,
        }

    def is_actionable(self, threshold: float = 0.6) -> bool:
        return (self.signal_type != SignalType.NEUTRAL
                and self.strength >= threshold)


class BaseStrategy(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def analyze(self, indicators: Dict, candle_result: Dict,
                symbol: str) -> Signal:
        pass

    def _score_rsi(self, rsi: float) -> tuple:
        if rsi <= 25:
            return SignalType.BUY, 0.9, f"RSI oversold ({rsi:.1f})"
        elif rsi <= 30:
            return SignalType.BUY, 0.7, f"RSI oversold ({rsi:.1f})"
        elif rsi >= 75:
            return SignalType.SELL, 0.9, f"RSI overbought ({rsi:.1f})"
        elif rsi >= 70:
            return SignalType.SELL, 0.7, f"RSI overbought ({rsi:.1f})"
        return SignalType.NEUTRAL, 0.0, ""

    def _score_macd(self, hist: float, hist_prev: float) -> tuple:
        if hist > 0 and hist_prev <= 0:
            return SignalType.BUY, 0.85, "MACD bullish crossover"
        elif hist < 0 and hist_prev >= 0:
            return SignalType.SELL, 0.85, "MACD bearish crossover"
        elif hist > 0 and hist > hist_prev:
            return SignalType.BUY, 0.5, "MACD bullish momentum"
        elif hist < 0 and hist < hist_prev:
            return SignalType.SELL, 0.5, "MACD bearish momentum"
        return SignalType.NEUTRAL, 0.0, ""

    def _score_bb(self, close: float, upper: float, lower: float,
                  middle: float) -> tuple:
        if close <= lower:
            return SignalType.BUY, 0.75, "Price at BB lower band"
        elif close >= upper:
            return SignalType.SELL, 0.75, "Price at BB upper band"
        elif close < middle:
            return SignalType.BUY, 0.3, "Price below BB middle"
        elif close > middle:
            return SignalType.SELL, 0.3, "Price above BB middle"
        return SignalType.NEUTRAL, 0.0, ""

    def _score_ema_trend(self, close: float, ema9: float,
                         ema21: float) -> tuple:
        if ema9 > ema21 and close > ema9:
            return SignalType.BUY, 0.65, "EMA bullish alignment"
        elif ema9 < ema21 and close < ema9:
            return SignalType.SELL, 0.65, "EMA bearish alignment"
        return SignalType.NEUTRAL, 0.0, ""

    def _score_stoch(self, k: float, d: float) -> tuple:
        if k < 20 and d < 20 and k > d:
            return SignalType.BUY, 0.7, f"Stoch oversold+cross ({k:.1f})"
        elif k > 80 and d > 80 and k < d:
            return SignalType.SELL, 0.7, f"Stoch overbought+cross ({k:.1f})"
        return SignalType.NEUTRAL, 0.0, ""


# ─────────────────── COMBINED STRATEGY ───────────────────

class CombinedStrategy(BaseStrategy):
    """
    Combines RSI + MACD + Bollinger Bands + EMA + Stochastic +
    Candlestick Patterns for high-confidence signals.
    Inspired by top trader methodologies.
    """

    def __init__(self):
        super().__init__("Combined_Master")

    def analyze(self, indicators: Dict, candle_result: Dict,
                symbol: str) -> Signal:
        buy_scores = []
        sell_scores = []
        reasons = []

        # RSI scoring
        rsi_type, rsi_score, rsi_reason = self._score_rsi(
            indicators.get('rsi', 50)
        )
        if rsi_type == SignalType.BUY:
            buy_scores.append(rsi_score)
            reasons.append(rsi_reason)
        elif rsi_type == SignalType.SELL:
            sell_scores.append(rsi_score)
            reasons.append(rsi_reason)

        # MACD scoring
        macd_type, macd_score, macd_reason = self._score_macd(
            indicators.get('macd_hist', 0),
            indicators.get('macd_hist_prev', 0)
        )
        if macd_type == SignalType.BUY:
            buy_scores.append(macd_score)
            reasons.append(macd_reason)
        elif macd_type == SignalType.SELL:
            sell_scores.append(macd_score)
            reasons.append(macd_reason)

        # Bollinger Bands scoring
        bb_type, bb_score, bb_reason = self._score_bb(
            indicators.get('close', 0),
            indicators.get('bb_upper', 0),
            indicators.get('bb_lower', 0),
            indicators.get('bb_middle', 0)
        )
        if bb_type == SignalType.BUY:
            buy_scores.append(bb_score)
            reasons.append(bb_reason)
        elif bb_type == SignalType.SELL:
            sell_scores.append(bb_score)
            reasons.append(bb_reason)

        # EMA Trend
        ema_type, ema_score, ema_reason = self._score_ema_trend(
            indicators.get('close', 0),
            indicators.get('ema9', 0),
            indicators.get('ema21', 0)
        )
        if ema_type == SignalType.BUY:
            buy_scores.append(ema_score)
            reasons.append(ema_reason)
        elif ema_type == SignalType.SELL:
            sell_scores.append(ema_score)
            reasons.append(ema_reason)

        # Stochastic RSI
        stoch_type, stoch_score, stoch_reason = self._score_stoch(
            indicators.get('stoch_k', 50),
            indicators.get('stoch_d', 50)
        )
        if stoch_type == SignalType.BUY:
            buy_scores.append(stoch_score)
            reasons.append(stoch_reason)
        elif stoch_type == SignalType.SELL:
            sell_scores.append(stoch_score)
            reasons.append(stoch_reason)

        # Candlestick Pattern bonus
        candle_signal = candle_result.get('signal', 'NEUTRAL')
        candle_strength = candle_result.get('strength', 0)
        candle_pattern = candle_result.get('top_pattern')

        if candle_signal == 'BUY' and candle_strength > 0.3:
            buy_scores.append(candle_strength)
            if candle_pattern:
                reasons.append(f"Pattern: {candle_pattern}")
        elif candle_signal == 'SELL' and candle_strength > 0.3:
            sell_scores.append(candle_strength)
            if candle_pattern:
                reasons.append(f"Pattern: {candle_pattern}")

        # Volume confirmation
        if indicators.get('volume_high', False):
            vol_ratio = indicators.get('volume_ratio', 1)
            if buy_scores and sum(buy_scores) > sum(sell_scores):
                buy_scores.append(0.4)
                reasons.append(f"High volume confirmation ({vol_ratio:.1f}x)")
            elif sell_scores:
                sell_scores.append(0.4)
                reasons.append(f"High volume confirmation ({vol_ratio:.1f}x)")

        # Compute weighted average
        total_buy = sum(buy_scores) / len(buy_scores) if buy_scores else 0
        total_sell = sum(sell_scores) / len(sell_scores) if sell_scores else 0

        # Require at least 3 confirming signals
        min_signals = 3
        if len(buy_scores) >= min_signals and total_buy > total_sell:
            return Signal(SignalType.BUY, total_buy, self.name,
                         reasons, indicators, candle_pattern)
        elif len(sell_scores) >= min_signals and total_sell > total_buy:
            return Signal(SignalType.SELL, total_sell, self.name,
                         reasons, indicators, candle_pattern)

        return Signal(SignalType.NEUTRAL, 0.0, self.name,
                     reasons, indicators, candle_pattern)


# ─────────────────── SCALPING STRATEGY (Micro-profit) ───────────────────

class ScalpingStrategy(BaseStrategy):
    """
    Quick micro-profit scalping: $0.4 - $1.0 per trade.
    Focuses on short-term momentum with tight risk control.
    """

    def __init__(self):
        super().__init__("Scalping_MicroProfit")

    def analyze(self, indicators: Dict, candle_result: Dict,
                symbol: str) -> Signal:
        reasons = []
        buy_score = 0.0
        sell_score = 0.0

        rsi = indicators.get('rsi', 50)
        macd_hist = indicators.get('macd_hist', 0)
        macd_hist_prev = indicators.get('macd_hist_prev', 0)
        close = indicators.get('close', 0)
        bb_lower = indicators.get('bb_lower', 0)
        bb_upper = indicators.get('bb_upper', 0)
        ema9 = indicators.get('ema9', 0)
        ema21 = indicators.get('ema21', 0)

        # Quick RSI reversal
        if 25 <= rsi <= 40 and close > ema9:
            buy_score += 0.7
            reasons.append(f"RSI recovery zone ({rsi:.1f})")
        elif 60 <= rsi <= 75 and close < ema9:
            sell_score += 0.7
            reasons.append(f"RSI distribution zone ({rsi:.1f})")

        # MACD momentum
        if macd_hist > 0 and macd_hist > macd_hist_prev:
            buy_score += 0.6
            reasons.append("MACD rising momentum")
        elif macd_hist < 0 and macd_hist < macd_hist_prev:
            sell_score += 0.6
            reasons.append("MACD falling momentum")

        # BB bounce
        bb_pct = (close - bb_lower) / (bb_upper - bb_lower) if bb_upper != bb_lower else 0.5
        if bb_pct <= 0.15:
            buy_score += 0.65
            reasons.append("BB lower bounce")
        elif bb_pct >= 0.85:
            sell_score += 0.65
            reasons.append("BB upper rejection")

        # Candle confirmation
        if candle_result.get('signal') == 'BUY':
            buy_score += candle_result.get('strength', 0) * 0.5
        elif candle_result.get('signal') == 'SELL':
            sell_score += candle_result.get('strength', 0) * 0.5

        vwap = indicators.get('vwap', 0)
        
        # VWAP Filter (Institutional Confirmation)
        vwap_filter_ok = True
        if vwap > 0:
            if close < vwap:  # Bearish territory below VWAP
                if rsi > 30 and buy_score > 0: # If it's a weak buy signal below VWAP, discard it
                    buy_score *= 0.5  # Penalize buy strength
                    reasons.append("Warning: Price below VWAP")
            elif close > vwap: # Bullish territory above VWAP
                if rsi < 70 and sell_score > 0:
                    sell_score *= 0.5
                    reasons.append("Warning: Price above VWAP")

        if buy_score >= 0.6 and buy_score > sell_score:
            return Signal(SignalType.BUY, min(buy_score, 1.0), self.name,
                         reasons, indicators,
                         candle_result.get('top_pattern'))
        elif sell_score >= 0.6 and sell_score > buy_score:
            return Signal(SignalType.SELL, min(sell_score, 1.0), self.name,
                         reasons, indicators,
                         candle_result.get('top_pattern'))

        return Signal(SignalType.NEUTRAL, 0.0, self.name,
                     reasons, indicators)
                     

# ─────────────────── VWAP BREAKOUT STRATEGY ───────────────────

class VWAPBreakoutStrategy(BaseStrategy):
    """
    Institutional strategy trading high-volume breakouts over VWAP 
    or significant support/resistance levels.
    """

    def __init__(self):
        super().__init__("VWAP_Breakout")

    def analyze(self, indicators: Dict, candle_result: Dict,
                symbol: str) -> Signal:
        reasons = []
        buy_score = 0.0
        sell_score = 0.0

        close = indicators.get('close', 0)
        vwap = indicators.get('vwap', 0)
        res = indicators.get('resistance', 0)
        sup = indicators.get('support', 0)
        vol_high = indicators.get('volume_high', False)
        
        if vwap == 0 or res == 0 or sup == 0:
            return Signal(SignalType.NEUTRAL, 0.0, self.name, reasons, indicators)

        dist_to_res = (res - close) / close
        dist_to_sup = (close - sup) / close
        dist_to_vwap = abs(close - vwap) / close

        # VWAP Crossover with Volume
        if vol_high and dist_to_vwap < 0.005: 
            if close > vwap and indicators.get('ema9', 0) > vwap:
                buy_score += 0.7
                reasons.append("Bullish VWAP Breakout with Volume")
            elif close < vwap and indicators.get('ema9', 0) < vwap:
                sell_score += 0.7
                reasons.append("Bearish VWAP Breakdown with Volume")

        # Resistance Breakout
        if vol_high and dist_to_res < 0.002 and close >= res:
            buy_score += 0.8
            reasons.append("Resistance Breakout detected")
        elif vol_high and dist_to_sup < 0.002 and close <= sup:
            sell_score += 0.8
            reasons.append("Support Breakdown detected")

        if buy_score >= 0.6 and buy_score > sell_score:
            return Signal(SignalType.BUY, min(buy_score, 1.0), self.name,
                         reasons, indicators, candle_result.get('top_pattern'))
        elif sell_score >= 0.6 and sell_score > buy_score:
            return Signal(SignalType.SELL, min(sell_score, 1.0), self.name,
                         reasons, indicators, candle_result.get('top_pattern'))

        return Signal(SignalType.NEUTRAL, 0.0, self.name, reasons, indicators)



combined_strategy = CombinedStrategy()
scalping_strategy = ScalpingStrategy()
vwap_strategy = VWAPBreakoutStrategy()
ALL_STRATEGIES = [scalping_strategy, vwap_strategy, combined_strategy]

