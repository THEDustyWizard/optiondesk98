"""OptionDesk 98 — Flask backend."""
from flask import Flask, render_template, jsonify

app = Flask(__name__)

@app.route("/boot")
def boot():
    return render_template("boot.html")

@app.route("/")
def desktop():
    return render_template("index.html")

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "version": "0.1.0"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
