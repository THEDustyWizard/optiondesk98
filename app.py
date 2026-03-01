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
