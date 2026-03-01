/* Learning Center.exe — Interactive lessons & glossary */
(function() {
  const GLOSSARY = {
    "Call Option": "A contract giving the buyer the right (not obligation) to BUY 100 shares at the strike price before expiration. You buy calls when you're bullish.",
    "Put Option": "A contract giving the buyer the right (not obligation) to SELL 100 shares at the strike price before expiration. You buy puts when you're bearish.",
    "Strike Price": "The price at which you can buy (call) or sell (put) the underlying stock. Also called the exercise price.",
    "Premium": "The price you pay to buy an option contract. This is your maximum loss for long positions.",
    "Expiration": "The date the option contract expires. After this date, the option is worthless if out-of-the-money.",
    "In The Money (ITM)": "Call: stock price > strike price. Put: stock price < strike price. The option has intrinsic value.",
    "Out of The Money (OTM)": "Call: stock price < strike price. Put: stock price > strike price. The option has no intrinsic value.",
    "At The Money (ATM)": "When the stock price equals (or is very close to) the strike price.",
    "Implied Volatility (IV)": "The market's forecast of how much the stock price will move. Higher IV = more expensive options. Calculated from option prices using Black-Scholes.",
    "Delta (Δ)": "How much the option price changes per $1 move in the stock. Call delta: 0 to 1. Put delta: -1 to 0. Also approximates probability of expiring ITM.",
    "Gamma (Γ)": "Rate of change of delta per $1 move in stock. Highest for ATM options near expiration. Think of it as 'acceleration' of delta.",
    "Theta (Θ)": "Daily time decay — how much value the option loses each day. Always negative for long options. Accelerates near expiration.",
    "Vega (ν)": "How much the option price changes per 1% change in IV. Higher for longer-dated options.",
    "Rho (ρ)": "Sensitivity to interest rate changes. Usually small impact except for deep ITM, long-dated options.",
    "Vanna": "Second-order Greek: rate of change of delta with respect to volatility. Important for volatility traders.",
    "Volga": "Second-order Greek: rate of change of vega with respect to volatility. Also called vomma.",
    "Charm": "Second-order Greek: rate of change of delta with respect to time. Shows how delta drifts as expiration approaches.",
    "Black-Scholes Model": "The most famous option pricing formula. Assumes: constant volatility, no dividends, European-style exercise, log-normal stock returns. Created by Fischer Black and Myron Scholes in 1973.",
    "Binomial Model": "Prices options by building a tree of possible price paths. More flexible than Black-Scholes — can handle American options and dividends.",
    "Monte Carlo": "Prices options by simulating thousands of random price paths and averaging the payoffs. Best for complex, path-dependent options.",
    "Break-Even": "The stock price at which your option trade neither makes nor loses money. Call: strike + premium. Put: strike - premium.",
    "Covered Call": "Selling a call against 100 shares you own. Generates income but caps upside. L2-eligible strategy.",
    "Cash-Secured Put (CSP)": "Selling a put while holding enough cash to buy 100 shares if assigned. Generates income while waiting to buy stock cheaper.",
    "Vertical Spread": "Buying and selling options at different strikes but same expiration. Bull call spread (bullish), bear put spread (bearish). Defined risk.",
    "Open Interest": "Total number of outstanding option contracts. Higher OI = more liquid. Look for OI > 100 for reasonable fills.",
    "Volume": "Number of contracts traded today. High volume = active interest and usually tighter spreads.",
    "Bid-Ask Spread": "Difference between bid and ask price. Tighter spread = more liquid = better fills. Avoid options with spreads > 10% of premium.",
  };

  const LESSONS = [
    {
      title: "📘 Lesson 1: What Are Options?",
      content: `<p>Options are contracts that give you the <strong>right</strong> (but not the obligation) to buy or sell a stock at a specific price by a specific date.</p>
        <p><strong>Two types:</strong></p>
        <ul>
          <li><strong>Call</strong> = Right to BUY → You're bullish 📈</li>
          <li><strong>Put</strong> = Right to SELL → You're bearish 📉</li>
        </ul>
        <p><strong>Key terms:</strong></p>
        <ul>
          <li><strong>Strike Price</strong> — the price you can buy/sell at</li>
          <li><strong>Premium</strong> — the price you pay for the option</li>
          <li><strong>Expiration</strong> — when the contract expires</li>
          <li><strong>1 contract</strong> = 100 shares</li>
        </ul>
        <p><em>Example: AAPL is at $150. You buy a $155 Call expiring in 30 days for $3.00. You pay $300 (3 × 100 shares). If AAPL goes to $165, your call is worth $10, and you made $700 profit.</em></p>`
    },
    {
      title: "📘 Lesson 2: The Greeks",
      content: `<p>Greeks measure how an option's price changes with different factors:</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin:8px 0;">
          <tr style="background:#e0e0e0;"><th style="padding:4px;">Greek</th><th>Measures</th><th>Think of it as...</th></tr>
          <tr><td style="padding:4px;"><strong>Delta (Δ)</strong></td><td>Price change per $1 stock move</td><td>Speed</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:4px;"><strong>Gamma (Γ)</strong></td><td>Delta change per $1 stock move</td><td>Acceleration</td></tr>
          <tr><td style="padding:4px;"><strong>Theta (Θ)</strong></td><td>Daily time decay</td><td>Rent you pay each day</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:4px;"><strong>Vega (ν)</strong></td><td>Price change per 1% IV change</td><td>Volatility sensitivity</td></tr>
          <tr><td style="padding:4px;"><strong>Rho (ρ)</strong></td><td>Price change per 1% rate change</td><td>Interest rate exposure</td></tr>
        </table>
        <p><em>Pro tip: Delta also approximates the probability of expiring in-the-money. A 0.30 delta call has roughly a 30% chance of being profitable.</em></p>`
    },
    {
      title: "📘 Lesson 3: Reading an Options Chain",
      content: `<p>An options chain shows all available contracts for a stock:</p>
        <ul>
          <li><strong>Calls</strong> on the left, <strong>Puts</strong> on the right</li>
          <li><strong>Strikes</strong> listed vertically</li>
          <li><strong>Green/highlighted rows</strong> = In The Money (ITM)</li>
          <li>Look at: <strong>Bid/Ask</strong> (what you can sell/buy for), <strong>Volume</strong>, <strong>OI</strong>, <strong>IV</strong></li>
        </ul>
        <p><strong>Tips for picking contracts:</strong></p>
        <ul>
          <li>Tight bid-ask spread (< 10% of premium)</li>
          <li>Volume > 50, Open Interest > 100</li>
          <li>Delta between 0.20-0.50 for directional plays</li>
          <li>30-60 DTE for swing trades</li>
        </ul>
        <p><em>Try it: Open Options Analyzer, type a ticker, and explore the chain!</em></p>`
    },
  ];

  window.LearningCenter = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      
      let view = 'lessons';
      
      function render() {
        let content = '';
        if (view === 'lessons') {
          content = LESSONS.map(l => `
            <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:6px;background:#fff;">
              <div style="background:#000080;color:#fff;padding:3px 6px;font-weight:bold;">${l.title}</div>
              <div style="padding:8px;font-size:12px;line-height:1.5;">${l.content}</div>
            </div>`).join('');
        } else {
          content = '<div style="border:2px solid;border-color:#808080 #fff #fff #808080;background:#fff;padding:6px;">';
          content += Object.entries(GLOSSARY).map(([term, def]) => `
            <div style="margin-bottom:8px;">
              <strong style="color:#000080;">${term}</strong><br>
              <span style="font-size:11px;">${def}</span>
            </div>`).join('<hr style="border:none;border-top:1px solid #ddd;">');
          content += '</div>';
        }
        
        el.innerHTML = `
          <div style="padding:4px;font-size:11px;">
            <div style="display:flex;gap:4px;margin-bottom:6px;">
              <button class="lc-tab ${view==='lessons'?'active':''}" data-v="lessons" style="padding:2px 10px;">📚 Lessons</button>
              <button class="lc-tab ${view==='glossary'?'active':''}" data-v="glossary" style="padding:2px 10px;">📖 Glossary</button>
            </div>
            <div style="overflow:auto;max-height:calc(100% - 30px);">${content}</div>
          </div>`;
        
        el.querySelectorAll('.lc-tab').forEach(tab => {
          tab.addEventListener('click', () => { view = tab.dataset.v; render(); });
        });
      }
      render();
    }
  };
})();
WM.registerProgram('learning-center', (containerId) => window.LearningCenter && window.LearningCenter.init(containerId));
