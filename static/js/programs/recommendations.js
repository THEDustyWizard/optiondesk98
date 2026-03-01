/* Recommendations.exe — Scored option picks */
(function() {
  window.Recommendations = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;font-size:11px;">
          <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
            <label>Symbol: <input class="rec-sym" type="text" style="width:70px;text-transform:uppercase;" placeholder="AAPL"></label>
            <label>Risk: <select class="rec-risk">
              <option value="conservative">Conservative</option>
              <option value="moderate" selected>Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select></label>
            <button class="rec-go" style="padding:2px 10px;">🔍 Screen</button>
            <span class="rec-status" style="color:#888;margin-left:auto;"></span>
          </div>
          <div class="rec-results" style="overflow:auto;max-height:calc(100% - 36px);"></div>
        </div>`;
      
      const symInput = el.querySelector('.rec-sym');
      const riskSelect = el.querySelector('.rec-risk');
      const goBtn = el.querySelector('.rec-go');
      const status = el.querySelector('.rec-status');
      const results = el.querySelector('.rec-results');
      
      async function screen() {
        const sym = symInput.value.trim().toUpperCase();
        if (!sym) return;
        status.textContent = 'Screening...';
        results.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">Analyzing options chain...</div>';
        
        try {
          const r = await fetch(\`/api/recommendations/\${sym}?risk=\${riskSelect.value}\`);
          const data = await r.json();
          if (data.error) throw new Error(data.error);
          
          status.textContent = \`\${data.count} picks • \${data.risk_level} • Spot: $\${data.spot_price}\`;
          
          if (data.recommendations.length === 0) {
            results.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">No options matched your risk criteria. Try adjusting the risk level.</div>';
            return;
          }
          
          results.innerHTML = data.recommendations.map(rec => {
            const scoreColor = rec.score >= 60 ? '#008000' : rec.score >= 40 ? '#806600' : '#cc0000';
            const signalColor = rec.signal === 'BUY' ? '#008000' : '#666';
            return \`
              <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:4px;background:#fff;">
                <div style="background:#000080;color:#fff;padding:2px 6px;display:flex;justify-content:space-between;">
                  <span><strong>\${rec.strategy}</strong> — \${rec.contract}</span>
                  <span style="color:\${scoreColor};background:#fff;padding:0 6px;font-weight:bold;">Score: \${rec.score}</span>
                </div>
                <div style="padding:6px;display:flex;gap:12px;flex-wrap:wrap;">
                  <div>
                    <div>Strike: <strong>$\${rec.strike.toFixed(2)}</strong></div>
                    <div>Exp: <strong>\${rec.expiration}</strong> (\${rec.dte}d)</div>
                    <div>Premium: <strong>$\${rec.premium.toFixed(2)}</strong> ($\${rec.premium_total.toFixed(2)}/contract)</div>
                    <div>IV: <strong>\${rec.iv.toFixed(1)}%</strong></div>
                  </div>
                  <div>
                    <div>Break-even: <strong>$\${rec.breakeven.toFixed(2)}</strong></div>
                    <div style="color:#008000;">TP: <strong>$\${rec.take_profit_premium.toFixed(2)}</strong> (underlying ~$\${rec.take_profit_underlying.toFixed(2)})</div>
                    <div style="color:#cc0000;">SL: <strong>$\${rec.stop_loss_premium.toFixed(2)}</strong> (underlying ~$\${rec.stop_loss_underlying.toFixed(2)})</div>
                    <div>P(Profit): <strong>\${rec.pop.toFixed(1)}%</strong></div>
                  </div>
                  <div>
                    <div>Δ \${rec.delta.toFixed(3)} | Γ \${rec.gamma.toFixed(4)}</div>
                    <div>Θ \${rec.theta.toFixed(4)} | ν \${rec.vega.toFixed(4)}</div>
                    <div>Vol: \${(rec.volume||0).toLocaleString()} | OI: \${(rec.open_interest||0).toLocaleString()}</div>
                    <div>EV: <strong>\${rec.ev.toFixed(4)}</strong> | Signal: <strong style="color:\${signalColor};">\${rec.signal}</strong></div>
                  </div>
                </div>
              </div>\`;
          }).join('');
        } catch(e) {
          status.textContent = 'Error';
          results.innerHTML = \`<div style="text-align:center;padding:40px;color:red;">\${e.message}</div>\`;
        }
      }
      
      goBtn.addEventListener('click', screen);
      symInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') screen(); });
    }
  };
})();
