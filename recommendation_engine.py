"""OptionDesk 98 — Recommendation Engine.

L2-eligible strategies: Long Call, Long Put, Covered Call, CSP, Vertical Spreads.
Scoring: Expected Value, risk-adjusted return, probability of profit.
"""
import math
from datetime import datetime
from pricing_engine import black_scholes, greeks, implied_volatility
from scipy.stats import norm


def probability_of_profit(S, K, T, r, sigma, option_type, premium):
    if T <= 0 or sigma <= 0:
        return 0.0
    if option_type == "call":
        breakeven = K + premium
        d2 = (math.log(S / breakeven) + (r - 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
        return round(norm.cdf(d2), 4)
    else:
        breakeven = K - premium
        if breakeven <= 0:
            return 1.0
        d2 = (math.log(S / breakeven) + (r - 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
        return round(norm.cdf(-d2), 4)


def expected_value(S, K, T, r, sigma, option_type, premium):
    theo = black_scholes(S, K, T, r, sigma, option_type)
    return round(theo - premium, 4)


def score_option(S, K, T, r, sigma, option_type, bid, ask, volume, open_interest):
    if ask <= 0 or T <= 0 or sigma <= 0:
        return 0
    premium = (bid + ask) / 2
    theo = black_scholes(S, K, T, r, sigma, option_type)
    g = greeks(S, K, T, r, sigma, option_type)
    pop = probability_of_profit(S, K, T, r, sigma, option_type, premium)
    score = 0
    edge = (theo - premium) / premium if premium > 0 else 0
    score += min(max(edge * 100, 0), 30)
    score += pop * 25
    liq = min((volume + open_interest) / 1000, 1) * 20
    score += liq
    spread_pct = (ask - bid) / ask if ask > 0 else 1
    score += max(0, (1 - spread_pct * 5)) * 15
    abs_delta = abs(g["delta"])
    if 0.2 <= abs_delta <= 0.5:
        score += 10
    elif 0.15 <= abs_delta <= 0.6:
        score += 5
    return round(min(score, 100), 1)


def calculate_tp_sl(S, K, T, sigma, option_type, premium):
    tp_premium = premium * 1.5
    sl_premium = premium * 0.5
    if option_type == "call":
        breakeven = K + premium
        tp_underlying = breakeven + premium * 0.5
        sl_underlying = S - S * sigma * math.sqrt(T) * 0.5
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


def _parse_dte(exp_str):
    try:
        exp_date = datetime.strptime(exp_str, "%Y-%m-%d")
        T = max((exp_date - datetime.utcnow()).days / 365, 0.001)
        dte = int(T * 365)
        return T, dte
    except Exception:
        return None, None


def screen_long_options(chain_data, spot_price, r=0.05, risk_level="moderate"):
    """Screen long calls and puts."""
    risk = RISK_FILTERS.get(risk_level, RISK_FILTERS["moderate"])
    recs = []
    for opt_type_key in ["calls", "puts"]:
        option_type = "call" if opt_type_key == "calls" else "put"
        for opt in chain_data.get(opt_type_key, []):
            K, bid, ask = opt.get("strike", 0), opt.get("bid", 0), opt.get("ask", 0)
            volume, oi, iv = opt.get("volume", 0), opt.get("open_interest", 0), opt.get("iv", 0)
            if ask <= 0 or bid <= 0 or iv <= 0:
                continue
            T, dte = _parse_dte(opt.get("expiration", ""))
            if T is None or dte > risk["max_dte"]:
                continue
            S, sigma, premium = spot_price, iv, (bid + ask) / 2
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
            recs.append({
                "contract": opt.get("contract", ""),
                "type": option_type, "strike": K, "expiration": opt.get("expiration", ""),
                "dte": dte, "bid": bid, "ask": ask,
                "premium": round(premium, 2), "premium_total": round(premium * 100, 2),
                "iv": round(iv * 100, 2), "score": score,
                "pop": round(pop * 100, 1), "ev": ev,
                "delta": g["delta"], "gamma": g["gamma"], "theta": g["theta"], "vega": g["vega"],
                **tp_sl, "volume": volume, "open_interest": oi,
                "strategy": f"Long {option_type.title()}",
                "signal": "BUY" if ev > 0 else "HOLD",
                "max_loss": round(premium * 100, 2),
                "max_gain": "Unlimited" if option_type == "call" else round((K - premium) * 100, 2),
            })
    return recs


def screen_covered_calls(chain_data, spot_price, r=0.05, risk_level="moderate"):
    """Covered calls: sell OTM calls against 100 shares."""
    risk = RISK_FILTERS.get(risk_level, RISK_FILTERS["moderate"])
    recs = []
    for opt in chain_data.get("calls", []):
        K, bid, ask = opt.get("strike", 0), opt.get("bid", 0), opt.get("ask", 0)
        volume, oi, iv = opt.get("volume", 0), opt.get("open_interest", 0), opt.get("iv", 0)
        if bid <= 0 or iv <= 0 or K <= spot_price:
            continue  # Only OTM calls
        T, dte = _parse_dte(opt.get("expiration", ""))
        if T is None or dte > risk["max_dte"]:
            continue
        premium = bid  # selling at bid
        g = greeks(spot_price, K, T, r, iv, "call")
        abs_delta = abs(g["delta"])
        if abs_delta > 0.4:  # too deep, avoid assignment
            continue
        # POP for covered call: P(stock stays below strike)
        pop = 1 - probability_of_profit(spot_price, K, T, r, iv, "call", 0)
        if pop < risk["min_pop"]:
            continue
        max_gain = round((K - spot_price + premium) * 100, 2)
        max_loss_approx = round((spot_price - premium) * 100, 2)  # stock goes to 0
        breakeven = round(spot_price - premium, 2)
        yield_pct = round(premium / spot_price * 100, 2)
        annual_yield = round(yield_pct * 365 / max(dte, 1), 2)
        score = min(pop * 30 + yield_pct * 5 + min((volume + oi) / 500, 1) * 20 + (1 if abs_delta < 0.3 else 0) * 10, 100)
        recs.append({
            "contract": opt.get("contract", ""),
            "type": "call", "strike": K, "expiration": opt.get("expiration", ""),
            "dte": dte, "bid": bid, "ask": ask,
            "premium": round(premium, 2), "premium_total": round(premium * 100, 2),
            "iv": round(iv * 100, 2), "score": round(score, 1),
            "pop": round(pop * 100, 1),
            "delta": g["delta"], "gamma": g["gamma"], "theta": g["theta"], "vega": g["vega"],
            "breakeven": breakeven,
            "take_profit_premium": round(premium * 0.5, 2),  # buy back at 50%
            "stop_loss_premium": round(premium * 2, 2),
            "take_profit_underlying": K,
            "stop_loss_underlying": breakeven,
            "volume": volume, "open_interest": oi,
            "strategy": "Covered Call",
            "signal": "SELL" if score > 50 else "HOLD",
            "max_gain": max_gain, "max_loss": max_loss_approx,
            "yield_pct": yield_pct, "annual_yield": annual_yield,
            "ev": round(premium - black_scholes(spot_price, K, T, r, iv, "call"), 4),
        })
    return recs


def screen_cash_secured_puts(chain_data, spot_price, r=0.05, risk_level="moderate"):
    """Cash-secured puts: sell OTM puts with cash collateral."""
    risk = RISK_FILTERS.get(risk_level, RISK_FILTERS["moderate"])
    recs = []
    for opt in chain_data.get("puts", []):
        K, bid, ask = opt.get("strike", 0), opt.get("bid", 0), opt.get("ask", 0)
        volume, oi, iv = opt.get("volume", 0), opt.get("open_interest", 0), opt.get("iv", 0)
        if bid <= 0 or iv <= 0 or K >= spot_price:
            continue  # Only OTM puts
        T, dte = _parse_dte(opt.get("expiration", ""))
        if T is None or dte > risk["max_dte"]:
            continue
        premium = bid
        g = greeks(spot_price, K, T, r, iv, "put")
        abs_delta = abs(g["delta"])
        if abs_delta > 0.4:
            continue
        pop = 1 - probability_of_profit(spot_price, K, T, r, iv, "put", 0)
        if pop < risk["min_pop"]:
            continue
        collateral = K * 100
        max_gain = round(premium * 100, 2)
        max_loss = round((K - premium) * 100, 2)
        breakeven = round(K - premium, 2)
        yield_pct = round(premium / K * 100, 2)
        annual_yield = round(yield_pct * 365 / max(dte, 1), 2)
        score = min(pop * 30 + yield_pct * 5 + min((volume + oi) / 500, 1) * 20 + (1 if abs_delta < 0.3 else 0) * 10, 100)
        recs.append({
            "contract": opt.get("contract", ""),
            "type": "put", "strike": K, "expiration": opt.get("expiration", ""),
            "dte": dte, "bid": bid, "ask": ask,
            "premium": round(premium, 2), "premium_total": round(premium * 100, 2),
            "iv": round(iv * 100, 2), "score": round(score, 1),
            "pop": round(pop * 100, 1),
            "delta": g["delta"], "gamma": g["gamma"], "theta": g["theta"], "vega": g["vega"],
            "breakeven": breakeven,
            "take_profit_premium": round(premium * 0.5, 2),
            "stop_loss_premium": round(premium * 2, 2),
            "take_profit_underlying": spot_price,
            "stop_loss_underlying": breakeven,
            "volume": volume, "open_interest": oi,
            "strategy": "Cash-Secured Put",
            "signal": "SELL" if score > 50 else "HOLD",
            "max_gain": max_gain, "max_loss": max_loss,
            "collateral": round(collateral, 2),
            "yield_pct": yield_pct, "annual_yield": annual_yield,
            "ev": round(premium - black_scholes(spot_price, K, T, r, iv, "put"), 4),
        })
    return recs


def screen_vertical_spreads(chain_data, spot_price, r=0.05, risk_level="moderate"):
    """Bull call spreads and bear put spreads."""
    risk = RISK_FILTERS.get(risk_level, RISK_FILTERS["moderate"])
    recs = []
    
    for spread_type in ["bull_call", "bear_put"]:
        opt_key = "calls" if spread_type == "bull_call" else "puts"
        options = chain_data.get(opt_key, [])
        opt_type = "call" if spread_type == "bull_call" else "put"
        
        # Group by expiration
        by_exp = {}
        for opt in options:
            exp = opt.get("expiration", "")
            if exp not in by_exp:
                by_exp[exp] = []
            by_exp[exp].append(opt)
        
        for exp, opts in by_exp.items():
            T, dte = _parse_dte(exp)
            if T is None or dte > risk["max_dte"]:
                continue
            opts.sort(key=lambda x: x.get("strike", 0))
            
            for i in range(len(opts) - 1):
                long_opt = opts[i] if spread_type == "bull_call" else opts[i + 1]
                short_opt = opts[i + 1] if spread_type == "bull_call" else opts[i]
                
                long_ask = long_opt.get("ask", 0)
                short_bid = short_opt.get("bid", 0)
                long_K = long_opt.get("strike", 0)
                short_K = short_opt.get("strike", 0)
                long_iv = long_opt.get("iv", 0)
                short_iv = short_opt.get("iv", 0)
                
                if long_ask <= 0 or short_bid <= 0 or long_iv <= 0:
                    continue
                
                net_debit = round(long_ask - short_bid, 2)
                if net_debit <= 0:
                    continue
                
                width = abs(short_K - long_K)
                if width <= 0 or width > spot_price * 0.1:
                    continue
                
                max_gain = round((width - net_debit) * 100, 2)
                max_loss = round(net_debit * 100, 2)
                risk_reward = round(max_gain / max_loss, 2) if max_loss > 0 else 0
                
                if spread_type == "bull_call":
                    breakeven = round(long_K + net_debit, 2)
                else:
                    breakeven = round(long_K - net_debit, 2)
                
                avg_iv = (long_iv + short_iv) / 2
                pop_val = probability_of_profit(spot_price, breakeven, T, r, avg_iv, opt_type, 0)
                if spread_type == "bear_put":
                    pop_val = 1 - pop_val
                
                if pop_val < risk["min_pop"] * 0.8:
                    continue
                
                vol = min(long_opt.get("volume", 0), short_opt.get("volume", 0))
                oi = min(long_opt.get("open_interest", 0), short_opt.get("open_interest", 0))
                
                score = min(pop_val * 25 + risk_reward * 10 + min((vol + oi) / 500, 1) * 20 + min(max_gain / 500, 1) * 15, 100)
                
                strategy_name = "Bull Call Spread" if spread_type == "bull_call" else "Bear Put Spread"
                
                recs.append({
                    "contract": f"{long_opt.get('contract','')} / {short_opt.get('contract','')}",
                    "type": opt_type, "strike": long_K,
                    "strike_short": short_K, "width": width,
                    "expiration": exp, "dte": dte,
                    "bid": short_bid, "ask": long_ask,
                    "premium": net_debit, "premium_total": round(net_debit * 100, 2),
                    "iv": round(avg_iv * 100, 2), "score": round(score, 1),
                    "pop": round(pop_val * 100, 1),
                    "breakeven": breakeven,
                    "take_profit_premium": round(net_debit + (width - net_debit) * 0.5, 2),
                    "stop_loss_premium": round(net_debit * 0.5, 2),
                    "take_profit_underlying": short_K if spread_type == "bull_call" else long_K,
                    "stop_loss_underlying": long_K if spread_type == "bull_call" else short_K,
                    "volume": vol, "open_interest": oi,
                    "strategy": strategy_name,
                    "signal": "BUY" if score > 50 else "HOLD",
                    "max_gain": max_gain, "max_loss": max_loss,
                    "risk_reward": risk_reward,
                    "delta": 0, "gamma": 0, "theta": 0, "vega": 0,
                    "ev": round(max_gain * pop_val - max_loss * (1 - pop_val), 2) / 100,
                })
    
    return recs


def screen_options(chain_data, spot_price, risk_free_rate=0.05, risk_level="moderate"):
    """Run all strategy screens and return combined sorted results."""
    all_recs = []
    all_recs.extend(screen_long_options(chain_data, spot_price, risk_free_rate, risk_level))
    all_recs.extend(screen_covered_calls(chain_data, spot_price, risk_free_rate, risk_level))
    all_recs.extend(screen_cash_secured_puts(chain_data, spot_price, risk_free_rate, risk_level))
    all_recs.extend(screen_vertical_spreads(chain_data, spot_price, risk_free_rate, risk_level))
    all_recs.sort(key=lambda x: x.get("score", 0), reverse=True)
    return all_recs[:30]
