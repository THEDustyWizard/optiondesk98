"""OptionDesk 98 — Pricing & Greeks Engine.

Models: Black-Scholes, Binomial (CRR), Monte Carlo
Greeks: Delta, Gamma, Theta, Vega, Rho (1st order) + Vanna, Volga, Charm (2nd order)
IV Solver: Newton-Raphson
"""
import math
import numpy as np
from scipy.stats import norm
from scipy.optimize import brentq


# ============================================================
# Black-Scholes
# ============================================================
def bs_d1(S, K, T, r, sigma):
    return (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))

def bs_d2(S, K, T, r, sigma):
    return bs_d1(S, K, T, r, sigma) - sigma * math.sqrt(T)

def black_scholes(S, K, T, r, sigma, option_type="call"):
    """Black-Scholes option price."""
    if T <= 0 or sigma <= 0:
        intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
        return intrinsic
    d1 = bs_d1(S, K, T, r, sigma)
    d2 = bs_d2(S, K, T, r, sigma)
    if option_type == "call":
        return S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
    else:
        return K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)


# ============================================================
# Binomial (Cox-Ross-Rubinstein)
# ============================================================
def binomial(S, K, T, r, sigma, option_type="call", steps=100):
    """CRR binomial tree pricing."""
    if T <= 0 or sigma <= 0:
        intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
        return intrinsic
    dt = T / steps
    u = math.exp(sigma * math.sqrt(dt))
    d = 1 / u
    p = (math.exp(r * dt) - d) / (u - d)
    disc = math.exp(-r * dt)
    
    # Terminal payoffs
    prices = np.array([S * u**(steps - 2*j) for j in range(steps + 1)])
    if option_type == "call":
        values = np.maximum(prices - K, 0)
    else:
        values = np.maximum(K - prices, 0)
    
    # Backward induction
    for i in range(steps - 1, -1, -1):
        values = disc * (p * values[:i+1] + (1 - p) * values[1:i+2])
    
    return float(values[0])


# ============================================================
# Monte Carlo
# ============================================================
def monte_carlo(S, K, T, r, sigma, option_type="call", simulations=10000, seed=42):
    """Monte Carlo option pricing."""
    if T <= 0 or sigma <= 0:
        intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
        return intrinsic
    rng = np.random.RandomState(seed)
    z = rng.standard_normal(simulations)
    ST = S * np.exp((r - 0.5 * sigma**2) * T + sigma * math.sqrt(T) * z)
    if option_type == "call":
        payoffs = np.maximum(ST - K, 0)
    else:
        payoffs = np.maximum(K - ST, 0)
    price = math.exp(-r * T) * np.mean(payoffs)
    return float(price)


# ============================================================
# Greeks (analytical Black-Scholes)
# ============================================================
def greeks(S, K, T, r, sigma, option_type="call"):
    """Compute all Greeks for an option."""
    if T <= 0 or sigma <= 0:
        return {k: 0.0 for k in ["delta","gamma","theta","vega","rho","vanna","volga","charm"]}
    
    d1 = bs_d1(S, K, T, r, sigma)
    d2 = bs_d2(S, K, T, r, sigma)
    sqrt_T = math.sqrt(T)
    n_d1 = norm.pdf(d1)
    N_d1 = norm.cdf(d1)
    N_d2 = norm.cdf(d2)
    
    # First order
    if option_type == "call":
        delta = N_d1
        theta = (-S * n_d1 * sigma / (2 * sqrt_T) 
                 - r * K * math.exp(-r * T) * N_d2) / 365
        rho = K * T * math.exp(-r * T) * N_d2 / 100
    else:
        delta = N_d1 - 1
        theta = (-S * n_d1 * sigma / (2 * sqrt_T) 
                 + r * K * math.exp(-r * T) * norm.cdf(-d2)) / 365
        rho = -K * T * math.exp(-r * T) * norm.cdf(-d2) / 100
    
    gamma = n_d1 / (S * sigma * sqrt_T)
    vega = S * n_d1 * sqrt_T / 100  # per 1% move in IV
    
    # Second order
    vanna = -n_d1 * d2 / sigma  # dDelta/dVol
    volga = vega * d1 * d2 / sigma  # dVega/dVol
    charm_val = -n_d1 * (2 * r * T - d2 * sigma * sqrt_T) / (2 * T * sigma * sqrt_T) / 365
    
    return {
        "delta": round(delta, 6),
        "gamma": round(gamma, 6),
        "theta": round(theta, 6),
        "vega": round(vega, 6),
        "rho": round(rho, 6),
        "vanna": round(vanna, 6),
        "volga": round(volga, 6),
        "charm": round(charm_val, 6),
    }


# ============================================================
# IV Solver (Newton-Raphson with Brent fallback)
# ============================================================
def implied_volatility(market_price, S, K, T, r, option_type="call"):
    """Solve for implied volatility given market price."""
    if T <= 0 or market_price <= 0:
        return 0.0
    
    intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
    if market_price < intrinsic:
        return 0.0
    
    # Newton-Raphson
    sigma = 0.3  # initial guess
    for _ in range(50):
        price = black_scholes(S, K, T, r, sigma, option_type)
        d1 = bs_d1(S, K, T, r, sigma)
        vega_raw = S * norm.pdf(d1) * math.sqrt(T)
        if vega_raw < 1e-12:
            break
        sigma = sigma - (price - market_price) / vega_raw
        if sigma <= 0.001:
            sigma = 0.001
        if abs(price - market_price) < 1e-8:
            return round(sigma, 6)
    
    # Brent fallback
    try:
        def objective(s):
            return black_scholes(S, K, T, r, s, option_type) - market_price
        sigma = brentq(objective, 0.001, 10.0, xtol=1e-8)
        return round(sigma, 6)
    except Exception:
        return round(sigma, 6)


# ============================================================
# Full pricing (all models + Greeks)
# ============================================================
def full_pricing(S, K, T, r, sigma, option_type="call", mc_sims=10000):
    """Run all pricing models and compute Greeks."""
    return {
        "inputs": {
            "spot": S, "strike": K, "time_to_expiry": round(T, 4),
            "risk_free_rate": r, "volatility": round(sigma, 4),
            "option_type": option_type,
        },
        "prices": {
            "black_scholes": round(black_scholes(S, K, T, r, sigma, option_type), 4),
            "binomial": round(binomial(S, K, T, r, sigma, option_type), 4),
            "monte_carlo": round(monte_carlo(S, K, T, r, sigma, option_type, mc_sims), 4),
        },
        "greeks": greeks(S, K, T, r, sigma, option_type),
    }
