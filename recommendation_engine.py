"""OptionDesk 98 — Recommendation Engine.

L2-eligible strategies: Long Call, Long Put, Covered Call, CSP, Vertical Spreads.
Scoring: Expected Value, risk-adjusted return, probability of profit.
"""
import math
from datetime import datetime
from pricing_engine import black_scholes, greeks, implied_volatility
from scipy.stats import norm


def probability_of_profit(S, K, T, r, sigma, option_type, premium):
    """Probability the option is profitable at expiry."""
    if T <= 0 or sigma <= 0:
        return 0.0
    if option_type == "call":
        breakeven = K + premium
        # P(ST > breakeven)
        d2 = (math.log(S / breakeven) + (r - 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
        return round(norm.cdf(d2), 4)
    else:
        breakeven = K - premium
        d2 = (math.log(S / breakeven) + (r - 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
        return round(norm.cdf(-d2), 4)


def expected_value(S, K, T, r, sigma, option_type, premium):
    """Expected value of the trade (theoretical price - premium)."""
    theo = black_scholes(S, K, T, r, sigma, option_type)
    return round(theo - premium, 4)


def score_option(S, K, T, r, sigma, option_type, bid, ask, volume, open_interest):
    """Score an option for recommendation quality (0-100)."""
    if ask <= 0 or T <= 0 or sigma <= 0:
        return 0
    
    premium = (bid + ask) / 2
    theo = black_scholes(S, K, T, r, sigma, option_type)
    g = greeks(S, K, T, r, sigma, option_type)
    pop = probability_of_profit(S, K, T, r, sigma, option_type, premium)
    ev = expected_value(S, K, T, r, sigma, option_type, premium)
    
    score = 0
    
    # Edge: theoretical value vs market price (0-30 pts)
    edge = (theo - premium) / premium if premium > 0 else 0
    score += min(max(edge * 100, 0), 30)
    
    # Probability of profit (0-25 pts)
    score += pop * 25
    
    # Liquidity: volume + OI (0-20 pts)
    liq = min((volume + open_interest) / 1000, 1) * 20
    score += liq
    
    # Tight spread (0-15 pts)
    spread_pct = (ask - bid) / ask if ask > 0 else 1
    score += max(0, (1 - spread_pct * 5)) * 15
    
    # Delta sweet spot: |delta| between 0.2-0.5 (0-10 pts)
    abs_delta = abs(g["delta"])
    if 0.2 <= abs_delta <= 0.5:
        score += 10
    elif 0.15 <= abs_delta <= 0.6:
        score += 5
    
    return round(min(score, 100), 1)


def calculate_tp_sl(S, K, T, sigma, option_type, premium):
    """Calculate take-profit and stop-loss levels."""
    # TP: 50% gain on premium
    tp_premium = premium * 1.5
    
    # SL: 50% loss on premium
    sl_premium = premium * 0.5
    
    # Estimate underlying prices for TP/SL
    if option_type == "call":
        breakeven = K + premium
        tp_underlying = breakeven + premium * 0.5  # where you'd have 50% gain
        sl_underlying = S - S * sigma * math.sqrt(T) * 0.5  # ~0.5 sigma move down
    else:
        breakeven = K - premium
        tp_underlying = breakeven - premium * 0.5
        sl_underlying = S + S * sigma * math.sqrt(T) * 0.5
    
    return {
        "breakeven": round(breakeven, 2),
        "take_profit_premium": round(tp_premium, 2),
        "stop_loss_premium": round(sl_premium, 2),
        "take_profit_underlying": round(tp_underlying, 2),
        "stop_loss_underlying": round(sl_underlying, 2),
    }


RISK_FILTERS = {
    "conservative": {"min_pop": 0.55, "max_dte": 45, "min_delta": 0.3, "max_delta": 0.5},
    "moderate": {"min_pop": 0.40, "max_dte": 60, "min_delta": 0.2, "max_delta": 0.6},
    "aggressive": {"min_pop": 0.25, "max_dte": 90, "min_delta": 0.1, "max_delta": 0.8},
}


def screen_options(chain_data, spot_price, risk_free_rate=0.05, risk_level="moderate"):
    """Screen an options chain and return scored recommendations."""
    risk = RISK_FILTERS.get(risk_level, RISK_FILTERS["moderate"])
    recommendations = []
    
    for opt_type_key in ["calls", "puts"]:
        option_type = "call" if opt_type_key == "calls" else "put"
        for opt in chain_data.get(opt_type_key, []):
            K = opt.get("strike", 0)
            bid = opt.get("bid", 0)
            ask = opt.get("ask", 0)
            volume = opt.get("volume", 0)
            oi = opt.get("open_interest", 0)
            iv = opt.get("iv", 0)
            
            if ask <= 0 or bid <= 0 or iv <= 0:
                continue
            
            # Calculate time to expiry
            exp_str = opt.get("expiration", "")
            try:
                exp_date = datetime.strptime(exp_str, "%Y-%m-%d")
                T = max((exp_date - datetime.utcnow()).days / 365, 0.001)
                dte = int(T * 365)
            except Exception:
                continue
            
            if dte > risk["max_dte"]:
                continue
            
            S = spot_price
            r = risk_free_rate
            sigma = iv
            premium = (bid + ask) / 2
            
            g = greeks(S, K, T, r, sigma, option_type)
            abs_delta = abs(g["delta"])
            
            if abs_delta < risk["min_delta"] or abs_delta > risk["max_delta"]:
                continue
            
            pop = probability_of_profit(S, K, T, r, sigma, option_type, premium)
            if pop < risk["min_pop"]:
                continue
            
            score = score_option(S, K, T, r, sigma, option_type, bid, ask, volume, oi)
            tp_sl = calculate_tp_sl(S, K, T, sigma, option_type, premium)
            ev = expected_value(S, K, T, r, sigma, option_type, premium)
            
            recommendations.append({
                "contract": opt.get("contract", ""),
                "type": option_type,
                "strike": K,
                "expiration": exp_str,
                "dte": dte,
                "bid": bid,
                "ask": ask,
                "premium": round(premium, 2),
                "premium_total": round(premium * 100, 2),  # per contract
                "iv": round(iv * 100, 2),
                "score": score,
                "pop": round(pop * 100, 1),
                "ev": ev,
                "delta": g["delta"],
                "gamma": g["gamma"],
                "theta": g["theta"],
                "vega": g["vega"],
                **tp_sl,
                "volume": volume,
                "open_interest": oi,
                "strategy": f"Long {option_type.title()}",
                "signal": "BUY" if ev > 0 else "HOLD",
            })
    
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations[:20]
