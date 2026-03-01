"""OptionDesk 98 — Flask backend."""
from flask import Flask, render_template, jsonify, request
import logging

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)

# Lazy-init data engine
_engine = None
def get_engine():
    global _engine
    if _engine is None:
        from data_providers import DataEngine
        _engine = DataEngine()
    return _engine


# ---- Pages ----
@app.route("/boot")
def boot():
    return render_template("boot.html")

@app.route("/")
def desktop():
    return render_template("index.html")


# ---- API ----
@app.route("/api/health")
def health():
    try:
        engine = get_engine()
        return jsonify({"status": "ok", "version": "0.1.0", "data": engine.get_health()})
    except Exception as e:
        return jsonify({"status": "ok", "version": "0.1.0", "data_error": str(e)})

@app.route("/api/quote/<symbol>")
def quote(symbol):
    try:
        return jsonify(get_engine().get_quote(symbol))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/options/<symbol>")
def options_chain(symbol):
    exp = request.args.get("expiration")
    try:
        return jsonify(get_engine().get_options_chain(symbol, exp))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/scanner")
def scanner():
    limit = request.args.get("limit", 100, type=int)
    try:
        return jsonify(get_engine().get_top_volume(limit))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sector/<sector>")
def sector(sector):
    try:
        return jsonify(get_engine().get_sector(sector))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)


# ---- Pricing & Greeks API ----
@app.route("/api/price")
def price_option():
    """Full pricing: /api/price?S=100&K=100&T=0.25&r=0.05&sigma=0.3&type=call"""
    try:
        from pricing_engine import full_pricing, implied_volatility
        S = float(request.args.get("S", 100))
        K = float(request.args.get("K", 100))
        T = float(request.args.get("T", 0.25))
        r = float(request.args.get("r", 0.05))
        sigma = float(request.args.get("sigma", 0.3))
        opt_type = request.args.get("type", "call")
        mc_sims = int(request.args.get("mc_sims", 10000))
        return jsonify(full_pricing(S, K, T, r, sigma, opt_type, mc_sims))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/iv")
def calc_iv():
    """IV solver: /api/iv?price=5.0&S=100&K=100&T=0.25&r=0.05&type=call"""
    try:
        from pricing_engine import implied_volatility
        market_price = float(request.args.get("price", 0))
        S = float(request.args.get("S", 100))
        K = float(request.args.get("K", 100))
        T = float(request.args.get("T", 0.25))
        r = float(request.args.get("r", 0.05))
        opt_type = request.args.get("type", "call")
        iv = implied_volatility(market_price, S, K, T, r, opt_type)
        return jsonify({"implied_volatility": iv, "iv_pct": round(iv * 100, 2)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/greeks/surface")
def greeks_surface():
    """Greeks across a range of spots and vols for visualization."""
    try:
        from pricing_engine import greeks as calc_greeks
        K = float(request.args.get("K", 100))
        T = float(request.args.get("T", 0.25))
        r = float(request.args.get("r", 0.05))
        opt_type = request.args.get("type", "call")
        greek = request.args.get("greek", "delta")
        
        spots = [K * (0.7 + i * 0.03) for i in range(21)]  # 70%-130% of strike
        vols = [0.1 + i * 0.05 for i in range(13)]  # 10%-70%
        
        surface = []
        for s in spots:
            row = []
            for v in vols:
                g = calc_greeks(s, K, T, r, v, opt_type)
                row.append(g.get(greek, 0))
            surface.append(row)
        
        return jsonify({
            "greek": greek,
            "spots": [round(s, 2) for s in spots],
            "vols": [round(v, 2) for v in vols],
            "surface": surface,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/recommendations/<symbol>")
def recommendations(symbol):
    """Get scored option recommendations for a symbol."""
    try:
        from recommendation_engine import screen_options
        risk = request.args.get("risk", "moderate")
        
        engine = get_engine()
        quote = engine.get_quote(symbol)
        chain = engine.get_options_chain(symbol)
        
        recs = screen_options(chain, quote["price"], risk_level=risk)
        
        return jsonify({
            "symbol": symbol.upper(),
            "spot_price": quote["price"],
            "risk_level": risk,
            "recommendations": recs,
            "count": len(recs),
            "timestamp": quote["timestamp"],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/news")
def news():
    """Fetch financial news via RSS."""
    try:
        import feedparser
        feeds = [
            ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex"),
            ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
            ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/topstories/"),
        ]
        articles = []
        for source, url in feeds:
            try:
                d = feedparser.parse(url)
                for entry in d.entries[:10]:
                    articles.append({
                        "title": entry.get("title", ""),
                        "url": entry.get("link", ""),
                        "source": source,
                        "date": entry.get("published", ""),
                    })
            except Exception:
                pass
        articles.sort(key=lambda x: x.get("date", ""), reverse=True)
        return jsonify({"articles": articles[:30], "count": len(articles)})
    except ImportError:
        return jsonify({"error": "feedparser not installed", "articles": [], "count": 0})
