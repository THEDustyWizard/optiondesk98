"""OptionDesk 98 — Multi-Provider Data Engine.

Fallback chain: Tradier → yfinance → Polygon → Alpha Vantage
Schwab is optional (Phase 6).
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
        hist = ticker.history(period="2d")
        
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
        """Get high-volume stocks. yfinance doesn't have a native screener,
        so we use a curated list of most-traded tickers."""
        # Top ~120 most actively traded US equities
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
                    if not t:
                        continue
                    info = t.fast_info
                    current = float(info.last_price) if hasattr(info, 'last_price') else 0
                    prev = float(info.previous_close) if hasattr(info, 'previous_close') else current
                    change = current - prev
                    change_pct = (change / prev * 100) if prev else 0
                    results.append({
                        "symbol": sym,
                        "price": round(current, 2),
                        "change": round(change, 2),
                        "change_pct": round(change_pct, 2),
                        "volume": int(info.last_volume) if hasattr(info, 'last_volume') else 0,
                        "market_cap": int(info.market_cap) if hasattr(info, 'market_cap') else 0,
                    })
                except Exception as e:
                    logger.debug(f"Skip {sym}: {e}")
        except Exception as e:
            logger.error(f"Batch fetch failed: {e}")
            # Fallback: fetch individually
            for sym in batch[:20]:
                try:
                    q = self.get_quote(sym)
                    results.append(q)
                except Exception:
                    pass
        
        results.sort(key=lambda x: x.get("volume", 0), reverse=True)
        return {
            "stocks": results[:limit],
            "count": len(results),
            "source": "yfinance",
            "timestamp": datetime.utcnow().isoformat()
        }


class TradierProvider(DataProvider):
    """Tradier — free sandbox tier with API key."""
    name = "tradier"
    
    def __init__(self, api_key=None, sandbox=True):
        self.api_key = api_key or os.environ.get("TRADIER_API_KEY", "")
        self.base_url = "https://sandbox.tradier.com/v1" if sandbox else "https://api.tradier.com/v1"
        if not self.api_key:
            raise ValueError("No Tradier API key")
    
    def _get(self, path, params=None):
        import requests
        headers = {"Authorization": f"Bearer {self.api_key}", "Accept": "application/json"}
        r = requests.get(f"{self.base_url}{path}", headers=headers, params=params or {}, timeout=10)
        r.raise_for_status()
        return r.json()
    
    def get_quote(self, symbol):
        data = self._get("/markets/quotes", {"symbols": symbol})
        q = data.get("quotes", {}).get("quote", {})
        return {
            "symbol": q.get("symbol", symbol),
            "price": float(q.get("last", 0)),
            "change": float(q.get("change", 0)),
            "change_pct": float(q.get("change_percentage", 0)),
            "volume": int(q.get("volume", 0)),
            "prev_close": float(q.get("prevclose", 0)),
            "market_cap": 0,
            "source": "tradier",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_options_chain(self, symbol, expiration=None):
        # Get expirations first
        exp_data = self._get(f"/markets/options/expirations", {"symbol": symbol})
        expirations = exp_data.get("expirations", {}).get("date", [])
        if not expirations:
            return {"symbol": symbol, "expirations": [], "calls": [], "puts": [], "source": "tradier"}
        
        exp = expiration if expiration and expiration in expirations else expirations[0]
        chain_data = self._get(f"/markets/options/chains", {"symbol": symbol, "expiration": exp})
        options = chain_data.get("options", {}).get("option", [])
        
        calls, puts = [], []
        for opt in (options if isinstance(options, list) else [options]):
            row = {
                "contract": opt.get("symbol", ""),
                "strike": float(opt.get("strike", 0)),
                "last": float(opt.get("last", 0) or 0),
                "bid": float(opt.get("bid", 0) or 0),
                "ask": float(opt.get("ask", 0) or 0),
                "volume": int(opt.get("volume", 0) or 0),
                "open_interest": int(opt.get("open_interest", 0) or 0),
                "iv": 0,
                "type": opt.get("option_type", ""),
                "expiration": exp,
                "in_the_money": False,
            }
            if opt.get("option_type") == "call":
                calls.append(row)
            else:
                puts.append(row)
        
        return {
            "symbol": symbol.upper(),
            "expirations": expirations,
            "selected_expiration": exp,
            "calls": calls,
            "puts": puts,
            "source": "tradier",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_top_volume(self, limit=100):
        # Tradier doesn't have a screener; delegate to yfinance for this
        raise NotImplementedError("Tradier doesn't support volume scanning")


class DataEngine:
    """Multi-provider data engine with automatic fallback."""
    
    def __init__(self):
        self.providers = []
        self.provider_status = {}
        self._init_providers()
    
    def _init_providers(self):
        # Try Tradier first
        try:
            tp = TradierProvider()
            self.providers.append(tp)
            self.provider_status["tradier"] = "available"
            logger.info("Tradier provider initialized")
        except Exception as e:
            self.provider_status["tradier"] = f"unavailable: {e}"
            logger.info(f"Tradier not available: {e}")
        
        # yfinance (always available if installed)
        try:
            yp = YFinanceProvider()
            self.providers.append(yp)
            self.provider_status["yfinance"] = "available"
            logger.info("yfinance provider initialized")
        except Exception as e:
            self.provider_status["yfinance"] = f"unavailable: {e}"
            logger.info(f"yfinance not available: {e}")
        
        # Polygon
        try:
            pp = PolygonProvider()
            self.providers.append(pp)
            self.provider_status["polygon"] = "available"
            logger.info("Polygon provider initialized")
        except Exception as e:
            self.provider_status["polygon"] = f"unavailable: {e}"
            logger.info(f"Polygon not available: {e}")
        
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
        """Get quotes for a predefined sector."""
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
        return {
            "sector": sector,
            "stocks": results,
            "count": len(results),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_health(self):
        return {
            "providers": self.provider_status,
            "active_count": sum(1 for v in self.provider_status.values() if v == "available"),
            "timestamp": datetime.utcnow().isoformat()
        }


class PolygonProvider(DataProvider):
    """Polygon.io data provider."""
    name = "polygon"
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("POLYGON_API_KEY", "")
        if not self.api_key:
            raise ValueError("No Polygon API key")
        self.base_url = "https://api.polygon.io"
    
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
            "source": "polygon",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_options_chain(self, symbol, expiration=None):
        params = {"underlying_ticker": symbol, "limit": 250, "order": "asc", "sort": "strike_price"}
        if expiration:
            params["expiration_date"] = expiration
        data = self._get("/v3/reference/options/contracts", params)
        # Polygon contracts endpoint gives metadata; pricing needs separate calls
        # For MVP, return contract list
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
                "expiration": exp,
                "in_the_money": False,
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
            "source": "polygon",
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
        return {"stocks": results, "count": len(results), "source": "polygon", "timestamp": datetime.utcnow().isoformat()}


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
