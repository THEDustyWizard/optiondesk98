# 📈 OptionDesk 98

> *Your desktop. Your edge.*

A Win98-themed options trading dashboard that runs locally. Real market data, three pricing models, full Greeks, scored recommendations — all wrapped in an authentic Windows 98 desktop simulation.

![Python](https://img.shields.io/badge/Python-3.11+-blue) ![Flask](https://img.shields.io/badge/Flask-3.0-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### 🖥️ Desktop Environment
- Authentic Windows 98 desktop simulation with [98.css](https://jdan.github.io/98.css/)
- BIOS boot sequence → progress bar → startup chime → desktop
- 12 draggable, resizable program windows + Recycle Bin
- Taskbar with Start menu, running programs, and clock
- Right-click context menu

### 📊 12 Desktop Programs

| Program | Description |
|---------|-------------|
| **Market Scanner** | Top 100 stocks by volume, sortable table |
| **Options Analyzer** | Single-ticker deep dive with full options chain |
| **Sector Scanner** | Defense & Finance sector pre-filtered views |
| **Greeks Lab** | Interactive pricing calculator with what-if slider |
| **Recommendations** | Scored option picks with TP/SL/break-even |
| **Watchlist** | Track favorite symbols with live quotes |
| **News Terminal** | Aggregated financial news via RSS |
| **Live TV** | Bloomberg, Fox Business, CNBC live streams |
| **Learning Center** | Interactive lessons + 25-term glossary |
| **Portfolio** | Position tracker with P&L calculation |
| **Settings** | API keys, risk level, data source health |
| **Notepad** | Trade notes with timestamps (Ctrl+D) |

### 🔬 Pricing Models
- **Black-Scholes** — analytical closed-form
- **Binomial** — Cox-Ross-Rubinstein (100-step tree)
- **Monte Carlo** — 10,000 simulation paths

### 📈 Greeks (1st + 2nd Order)
- **First Order:** Delta, Gamma, Theta, Vega, Rho
- **Second Order:** Vanna, Volga, Charm

### 💰 Recommendation Engine
- Expected Value scoring (0-100)
- Probability of profit calculation
- Break-even, take-profit, and stop-loss targets
- Risk tolerance filter (Conservative / Moderate / Aggressive)
- L2-eligible strategies: Long Calls, Long Puts

### 🔌 Multi-Provider Data
- **Tradier** (free sandbox tier, API key required)
- **yfinance** (free, no key needed — default)
- Automatic fallback between providers
- Health check on startup

## Quick Start

### Requirements
- Python 3.11+
- pip

### Installation

```bash
git clone https://github.com/THEDustyWizard/optiondesk98.git
cd optiondesk98
pip install -r requirements.txt
```

### Run

```bash
python3 start.py
```

This opens your browser to the boot sequence at `http://localhost:5000/boot`.

Or run directly:

```bash
python3 app.py
# Then open http://localhost:5000/boot in your browser
```

### Optional: API Keys

Set these environment variables for additional data providers:

```bash
export TRADIER_API_KEY="your-key-here"     # Tradier (sandbox)
export POLYGON_API_KEY="your-key-here"     # Massive.com (coming soon)
export ALPHA_VANTAGE_KEY="your-key-here"   # Alpha Vantage (coming soon)
```

Or configure them in Settings.exe within the app.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Provider status & health check |
| `GET /api/quote/<symbol>` | Stock quote |
| `GET /api/options/<symbol>` | Options chain |
| `GET /api/scanner?limit=100` | Top volume scanner |
| `GET /api/sector/<sector>` | Sector scan (defense, finance) |
| `GET /api/price?S=&K=&T=&r=&sigma=&type=` | Option pricing (all models + Greeks) |
| `GET /api/iv?price=&S=&K=&T=&r=&type=` | Implied volatility solver |
| `GET /api/greeks/surface?K=&T=&r=&type=&greek=` | Greeks surface data |
| `GET /api/recommendations/<symbol>?risk=` | Scored recommendations |
| `GET /api/news` | Financial news feed |

## Tech Stack

- **Backend:** Python / Flask
- **Pricing:** NumPy, SciPy
- **Data:** yfinance, Tradier API
- **Frontend:** Vanilla JS + [98.css](https://jdan.github.io/98.css/)
- **News:** feedparser + RSS
- **Storage:** localStorage (client-side)

## Cross-Platform

Works on Windows, macOS, and Linux. Just needs Python 3.11+ and a modern browser.

## License

MIT

---

*Built with 🦞 by MeatyClaw & APHELION*
