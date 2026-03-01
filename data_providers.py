"""OptionDesk 98 — Multi-Provider Data Engine.

Fallback chain: Schwab → yfinance → Massive (fka Polygon.io) → Alpha Vantage
"""
import os
import time
import logging
from datetime import datetime, timedelta
from functools import lru_cache

logger = logging.getLogger("optiondesk98.data")


class DataProvider:
    """Base class for data providers."""
    name = "base"
    
    def get_quote(self, symbol):
        raise NotImplementedError
    
    def get_options_chain(self, symbol, expiration=None):
        raise NotImplementedError
    
    def get_top_volume(self, limit=100):
        raise NotImplementedError
    
    def health_check(self):
        try:
            self.get_quote("AAPL")
            return True
        except Exception:
            return False


class SchwabProvider(DataProvider):
    """Charles Schwab Trader API — requires OAuth2 app credentials.
    
    Uses schwab-py library for auth and data access.
    Requires: SCHWAB_API_KEY, SCHWAB_API_SECRET environment variables.
    First-time setup requires browser-based OAuth flow.
    """
    name = "schwab"
    
    def __init__(self, api_key=None, api_secret=None):
        self.api_key = api_key or os.environ.get("SCHWAB_API_KEY", "")
        self.api_secret = api_secret or os.environ.get("SCHWAB_API_SECRET", "")
        if not self.api_key or not self.api_secret:
            raise ValueError("No Schwab API key/secret. Register at developer.schwab.com")
        
        self.client = None
        self.token_path = os.path.join(os.path.dirname(__file__), ".schwab_token.json")
        self._init_client()
    
    def _init_client(self):
        try:
            import schwab
            import httpx
            self._httpx = httpx
            
            # Try to load existing token
            if os.path.exists(self.token_path):
                try:
                    self.client = schwab.auth.client_from_token_file(
                        self.token_path, self.api_key, self.api_secret)
                    logger.info("Schwab client loaded from token file")
                    return
                except Exception as e:
                    logger.warning(f"Token file invalid, need re-auth: {e}")
            
            # If no valid token, we can't do browser auth in a server context
            # User needs to run the auth flow separately
            raise ValueError(
                "Schwab requires OAuth authentication. Run: python3 schwab_auth.py "
                "to complete the browser login flow, then restart the app."
            )
        except ImportError:
            raise ImportError("schwab-py not installed. Run: pip install schwab-py")
    
    def get_quote(self, symbol):
        resp = self.client.get_quote(symbol)
        if resp.status_code != self._httpx.codes.OK:
            raise Exception(f"Schwab quote error: {resp.status_code}")
        data = resp.json()
        q = data.get(symbol, {}).get("quote", {})
        ref = data.get(symbol, {}).get("reference", {})
        price = float(q.get("lastPrice", q.get("mark", 0)))
        prev = float(q.get("closePrice", price))
        change = price - prev
        return {
            "symbol": symbol.upper(),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change / prev * 100 if prev else 0, 2),
            "volume": int(q.get("totalVolume", 0)),
            "prev_close": round(prev, 2),
            "market_cap": 0,
            "bid": float(q.get("bidPrice", 0)),
            "ask": float(q.get("askPrice", 0)),
            "high": float(q.get("highPrice", 0)),
            "low": float(q.get("lowPrice", 0)),
            "source": "schwab",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_options_chain(self, symbol, expiration=None):
        kwargs = {"symbol": symbol, "contract_type": None}
        if expiration:
            kwargs["to_date"] = datetime.strptime(expiration, "%Y-%m-%d")
            kwargs["from_date"] = kwargs["to_date"]
        
        resp = self.client.get_option_chain(symbol)
        if resp.status_code != self._httpx.codes.OK:
            raise Exception(f"Schwab chain error: {resp.status_code}")
        data = resp.json()
        
        calls, puts = [], []
        expirations = set()
        
        for exp_key, strikes in data.get("callExpDateMap", {}).items():
            exp_date = exp_key.split(":")[0]
            expirations.add(exp_date)
            for strike_key, options in strikes.items():
                for opt in options:
                    calls.append(self._format_option(opt, "call", exp_date))
        
        for exp_key, strikes in data.get("putExpDateMap", {}).items():
            exp_date = exp_key.split(":")[0]
            expirations.add(exp_date)
            for strike_key, options in strikes.items():
                for opt in options:
                    puts.append(self._format_option(opt, "put", exp_date))
        
        sorted_exps = sorted(list(expirations))
        selected = expiration if expiration in sorted_exps else (sorted_exps[0] if sorted_exps else "")
        
        if expiration:
            calls = [c for c in calls if c["expiration"] == expiration]
            puts = [p for p in puts if p["expiration"] == expiration]
        elif sorted_exps:
            calls = [c for c in calls if c["expiration"] == sorted_exps[0]]
            puts = [p for p in puts if p["expiration"] == sorted_exps[0]]
        
        return {
            "symbol": symbol.upper(),
            "expirations": sorted_exps,
            "selected_expiration": selected,
            "calls": calls,
            "puts": puts,
            "source": "schwab",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _format_option(self, opt, opt_type, exp_date):
        return {
            "contract": opt.get("symbol", ""),
            "strike": float(opt.get("strikePrice", 0)),
            "last": float(opt.get("last", 0)),
            "bid": float(opt.get("bid", 0)),
            "ask": float(opt.get("ask", 0)),
            "volume": int(opt.get("totalVolume", 0)),
            "open_interest": int(opt.get("openInterest", 0)),
            "iv": float(opt.get("volatility", 0)) / 100,  # Schwab returns as percentage
            "type": opt_type,
            "expiration": exp_date,
            "in_the_money": opt.get("inTheMoney", False),
            "delta": float(opt.get("delta", 0)),
            "gamma": float(opt.get("gamma", 0)),
            "theta": float(opt.get("theta", 0)),
            "vega": float(opt.get("vega", 0)),
        }
    
    def get_top_volume(self, limit=100):
        # Schwab doesn't have a screener endpoint; delegate to fallback
        raise NotImplementedError("Schwab doesn't support volume scanning")


class YFinanceProvider(DataProvider):
    """yfinance — free, no API key needed."""
    name = "yfinance"
    
    def __init__(self):
        try:
            import yfinance
            self.yf = yfinance
        except ImportError:
            raise ImportError("yfinance not installed. Run: pip install yfinance")
    
    def get_quote(self, symbol):
        ticker = self.yf.Ticker(symbol)
        info = ticker.fast_info
        current = float(info.last_price) if hasattr(info, 'last_price') else 0
        prev_close = float(info.previous_close) if hasattr(info, 'previous_close') else current
        change = current - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {
            "symbol": symbol.upper(),
            "price": round(current, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": int(info.last_volume) if hasattr(info, 'last_volume') else 0,
            "prev_close": round(prev_close, 2),
            "market_cap": int(info.market_cap) if hasattr(info, 'market_cap') else 0,
            "source": "yfinance",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_options_chain(self, symbol, expiration=None):
        ticker = self.yf.Ticker(symbol)
        expirations = ticker.options
        if not expirations:
            return {"symbol": symbol, "expirations": [], "calls": [], "puts": [], "source": "yfinance"}
        exp = expiration if expiration and expiration in expirations else expirations[0]
        chain = ticker.option_chain(exp)
        
        def format_options(df, opt_type):
            rows = []
            for _, row in df.iterrows():
                rows.append({
                    "contract": row.get("contractSymbol", ""),
                    "strike": float(row.get("strike", 0)),
                    "last": float(row.get("lastPrice", 0)),
                    "bid": float(row.get("bid", 0)),
                    "ask": float(row.get("ask", 0)),
                    "volume": int(row.get("volume", 0)) if row.get("volume") and row.get("volume") == row.get("volume") else 0,
                    "open_interest": int(row.get("openInterest", 0)) if row.get("openInterest") and row.get("openInterest") == row.get("openInterest") else 0,
                    "iv": float(row.get("impliedVolatility", 0)),
                    "type": opt_type,
                    "expiration": exp,
                    "in_the_money": bool(row.get("inTheMoney", False)),
                })
            return rows
        
        return {
            "symbol": symbol.upper(),
            "expirations": list(expirations),
            "selected_expiration": exp,
            "calls": format_options(chain.calls, "call"),
            "puts": format_options(chain.puts, "put"),
            "source": "yfinance",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_top_volume(self, limit=100):
        TICKERS = [
            "AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA","AMD","INTC","MU",
            "AVGO","NFLX","CRM","ORCL","QCOM","ADBE","TXN","AMAT","LRCX","KLAC",
            "JPM","BAC","GS","MS","WFC","C","BX","SCHW","USB","PNC",
            "LMT","RTX","NOC","GD","LHX","BA","HII","TDG","HWM","TXT",
            "SPY","QQQ","IWM","DIA","XLF","XLE","XLK","XLV","XLI","ARKK",
            "V","MA","PYPL","SQ","AXP","COF","DFS","ALLY",
            "XOM","CVX","OXY","COP","SLB","HAL","DVN","MPC",
            "UNH","JNJ","PFE","ABBV","MRK","LLY","TMO","ABT",
            "COST","WMT","TGT","HD","LOW","SBUX","MCD","NKE",
            "DIS","CMCSA","T","VZ","TMUS",
            "F","GM","RIVN","LCID","NIO",
            "COIN","HOOD","MARA","RIOT","MSTR",
            "PLTR","SNOW","DDOG","NET","CRWD","ZS","PANW",
            "SOFI","UPST","AFRM","NU","GRAB",
            "ARM","SMCI","DELL","HPE","MRVL"
        ]
        results = []
        batch = TICKERS[:limit]
        try:
            tickers = self.yf.Tickers(" ".join(batch))
            for sym in batch:
                try:
                    t = tickers.tickers.get(sym)
                    if not t: continue
                    info = t.fast_info
                    current = float(info.last_price) if hasattr(info, 'last_price') else 0
                    prev = float(info.previous_close) if hasattr(info, 'previous_close') else current
                    change = current - prev
                    results.append({
                        "symbol": sym, "price": round(current, 2),
                        "change": round(change, 2),
                        "change_pct": round(change / prev * 100 if prev else 0, 2),
                        "volume": int(info.last_volume) if hasattr(info, 'last_volume') else 0,
                        "market_cap": int(info.market_cap) if hasattr(info, 'market_cap') else 0,
                    })
                except Exception as e:
                    logger.debug(f"Skip {sym}: {e}")
        except Exception as e:
            logger.error(f"Batch fetch failed: {e}")
            for sym in batch[:20]:
                try:
                    q = self.get_quote(sym)
                    results.append(q)
                except Exception:
                    pass
        results.sort(key=lambda x: x.get("volume", 0), reverse=True)
        return {"stocks": results[:limit], "count": len(results), "source": "yfinance", "timestamp": datetime.utcnow().isoformat()}


class MassiveProvider(DataProvider):
    """Massive (formerly Polygon.io) data provider."""
    name = "massive"
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("MASSIVE_API_KEY", os.environ.get("POLYGON_API_KEY", ""))
        if not self.api_key:
            raise ValueError("No Massive API key")
        self.base_url = "https://api.massive.com"
    
    def _get(self, path, params=None):
        import requests
        params = params or {}
        params["apiKey"] = self.api_key
        r = requests.get(f"{self.base_url}{path}", params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    
    def get_quote(self, symbol):
        data = self._get(f"/v2/aggs/ticker/{symbol}/prev")
        results = data.get("results", [{}])
        if not results:
            raise Exception(f"No data for {symbol}")
        bar = results[0]
        close = float(bar.get("c", 0))
        prev_close = float(bar.get("o", close))
        change = close - prev_close
        return {
            "symbol": symbol.upper(),
            "price": round(close, 2),
            "change": round(change, 2),
            "change_pct": round(change / prev_close * 100 if prev_close else 0, 2),
            "volume": int(bar.get("v", 0)),
            "prev_close": round(prev_close, 2),
            "market_cap": 0,
            "source": "massive",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_options_chain(self, symbol, expiration=None):
        params = {"underlying_ticker": symbol, "limit": 250, "order": "asc", "sort": "strike_price"}
        if expiration:
            params["expiration_date"] = expiration
        data = self._get("/v3/reference/options/contracts", params)
        contracts = data.get("results", [])
        calls, puts = [], []
        expirations = set()
        for c in contracts:
            exp = c.get("expiration_date", "")
            expirations.add(exp)
            row = {
                "contract": c.get("ticker", ""),
                "strike": float(c.get("strike_price", 0)),
                "last": 0, "bid": 0, "ask": 0,
                "volume": 0, "open_interest": 0, "iv": 0,
                "type": c.get("contract_type", "").lower(),
                "expiration": exp, "in_the_money": False,
            }
            if row["type"] == "call":
                calls.append(row)
            else:
                puts.append(row)
        return {
            "symbol": symbol.upper(),
            "expirations": sorted(list(expirations)),
            "selected_expiration": expiration or (sorted(list(expirations))[0] if expirations else ""),
            "calls": calls, "puts": puts,
            "source": "massive",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_top_volume(self, limit=100):
        data = self._get("/v2/snapshot/locale/us/markets/stocks/tickers")
        tickers = data.get("tickers", [])
        tickers.sort(key=lambda x: x.get("day", {}).get("v", 0), reverse=True)
        results = []
        for t in tickers[:limit]:
            day = t.get("day", {})
            prev = t.get("prevDay", {})
            price = float(day.get("c", 0))
            prev_close = float(prev.get("c", price))
            change = price - prev_close
            results.append({
                "symbol": t.get("ticker", ""),
                "price": round(price, 2),
                "change": round(change, 2),
                "change_pct": round(change / prev_close * 100 if prev_close else 0, 2),
                "volume": int(day.get("v", 0)),
                "market_cap": 0,
            })
        return {"stocks": results, "count": len(results), "source": "massive", "timestamp": datetime.utcnow().isoformat()}


class AlphaVantageProvider(DataProvider):
    """Alpha Vantage data provider."""
    name = "alpha_vantage"
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("ALPHA_VANTAGE_KEY", "")
        if not self.api_key:
            raise ValueError("No Alpha Vantage API key")
        self.base_url = "https://www.alphavantage.co/query"
    
    def _get(self, params):
        import requests
        params["apikey"] = self.api_key
        r = requests.get(self.base_url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    
    def get_quote(self, symbol):
        data = self._get({"function": "GLOBAL_QUOTE", "symbol": symbol})
        q = data.get("Global Quote", {})
        price = float(q.get("05. price", 0))
        change = float(q.get("09. change", 0))
        change_pct = float(q.get("10. change percent", "0").replace("%", ""))
        return {
            "symbol": symbol.upper(),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": int(q.get("06. volume", 0)),
            "prev_close": round(float(q.get("08. previous close", 0)), 2),
            "market_cap": 0,
            "source": "alpha_vantage",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_options_chain(self, symbol, expiration=None):
        raise NotImplementedError("Alpha Vantage doesn't provide options data")
    
    def get_top_volume(self, limit=100):
        raise NotImplementedError("Alpha Vantage doesn't support volume scanning")


class DataEngine:
    """Multi-provider data engine with automatic fallback."""
    
    def __init__(self):
        self.providers = []
        self.provider_status = {}
        self._init_providers()
    
    def _init_providers(self):
        # Schwab (primary — user's brokerage)
        try:
            sp = SchwabProvider()
            self.providers.append(sp)
            self.provider_status["schwab"] = "available"
            logger.info("Schwab provider initialized")
        except Exception as e:
            self.provider_status["schwab"] = f"unavailable: {e}"
            logger.info(f"Schwab not available: {e}")
        
        # yfinance (free fallback)
        try:
            yp = YFinanceProvider()
            self.providers.append(yp)
            self.provider_status["yfinance"] = "available"
            logger.info("yfinance provider initialized")
        except Exception as e:
            self.provider_status["yfinance"] = f"unavailable: {e}"
            logger.info(f"yfinance not available: {e}")
        
        # Massive (fka Polygon.io)
        try:
            mp = MassiveProvider()
            self.providers.append(mp)
            self.provider_status["massive"] = "available"
            logger.info("Massive provider initialized")
        except Exception as e:
            self.provider_status["massive"] = f"unavailable: {e}"
            logger.info(f"Massive not available: {e}")
        
        # Alpha Vantage
        try:
            av = AlphaVantageProvider()
            self.providers.append(av)
            self.provider_status["alpha_vantage"] = "available"
            logger.info("Alpha Vantage provider initialized")
        except Exception as e:
            self.provider_status["alpha_vantage"] = f"unavailable: {e}"
            logger.info(f"Alpha Vantage not available: {e}")
    
    def _call_with_fallback(self, method_name, *args, **kwargs):
        last_error = None
        for provider in self.providers:
            try:
                method = getattr(provider, method_name)
                return method(*args, **kwargs)
            except NotImplementedError:
                continue
            except Exception as e:
                last_error = e
                logger.warning(f"{provider.name}.{method_name} failed: {e}")
                continue
        raise Exception(f"All providers failed for {method_name}: {last_error}")
    
    def get_quote(self, symbol):
        return self._call_with_fallback("get_quote", symbol.upper().strip())
    
    def get_options_chain(self, symbol, expiration=None):
        return self._call_with_fallback("get_options_chain", symbol.upper().strip(), expiration)
    
    def get_top_volume(self, limit=100):
        return self._call_with_fallback("get_top_volume", limit)
    
    def get_sector(self, sector):
        SECTORS = {
            "defense": ["LMT","RTX","NOC","GD","LHX","BA","HII","TDG","HWM","TXT","LDOS","KTOS","AVAV","MRCY"],
            "finance": ["JPM","GS","MS","BAC","WFC","C","BX","SCHW","USB","PNC","BLK","SPGI","ICE","CME","MCO"],
        }
        symbols = SECTORS.get(sector.lower(), [])
        if not symbols:
            return {"sector": sector, "stocks": [], "error": f"Unknown sector: {sector}"}
        results = []
        for sym in symbols:
            try:
                q = self.get_quote(sym)
                results.append(q)
            except Exception as e:
                logger.debug(f"Sector scan skip {sym}: {e}")
        results.sort(key=lambda x: x.get("volume", 0), reverse=True)
        return {"sector": sector, "stocks": results, "count": len(results), "timestamp": datetime.utcnow().isoformat()}
    
    def get_health(self):
        return {
            "providers": self.provider_status,
            "active_count": sum(1 for v in self.provider_status.values() if v == "available"),
            "timestamp": datetime.utcnow().isoformat()
        }
