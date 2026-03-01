/* Recommendations.exe — Scored option picks with multiple strategies */
(function() {
  window.Recommendations = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;font-size:11px;">
          <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;flex-wrap:wrap;">
            <label>Symbol: <input class="rec-sym" type="text" style="width:70px;text-transform:uppercase;" placeholder="AAPL"></label>
            <label>Risk: <select class="rec-risk">
              <option value="conservative">Conservative</option>
              <option value="moderate" selected>Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select></label>
            <button class="rec-go" style="padding:2px 10px;">🔍 Screen</button>
            <span class="rec-status" style="color:#888;margin-left:auto;"></span>
          </div>
          <div style="display:flex;gap:4px;margin-bottom:6px;">
            <button class="rec-filter active" data-f="all" style="padding:2px 6px;">All</button>
            <button class="rec-filter" data-f="Long Call" style="padding:2px 6px;">Long Call</button>
            <button class="rec-filter" data-f="Long Put" style="padding:2px 6px;">Long Put</button>
            <button class="rec-filter" data-f="Covered Call" style="padding:2px 6px;">Covered Call</button>
            <button class="rec-filter" data-f="Cash-Secured Put" style="padding:2px 6px;">CSP</button>
            <button class="rec-filter" data-f="spread" style="padding:2px 6px;">Spreads</button>
          </div>
          <div class="rec-results" style="overflow:auto;max-height:calc(100% - 60px);"></div>
        </div>`;
      
      const symInput = el.querySelector('.rec-sym');
      const riskSelect = el.querySelector('.rec-risk');
      const goBtn = el.querySelector('.rec-go');
      const status = el.querySelector('.rec-status');
      const results = el.querySelector('.rec-results');
      let allRecs = [];
      let activeFilter = 'all';
      
      function renderRecs() {
        let filtered = allRecs;
        if (activeFilter !== 'all') {
          if (activeFilter === 'spread') {
            filtered = allRecs.filter(r => r.strategy.includes('Spread'));
          } else {
            filtered = allRecs.filter(r => r.strategy === activeFilter);
          }
        }
        
        if (filtered.length === 0) {
          results.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">No options matched. Try a different risk level or strategy filter.</div>';
          return;
        }
        
        results.innerHTML = filtered.map(rec => {
          const scoreColor = rec.score >= 60 ? '#008000' : rec.score >= 40 ? '#806600' : '#cc0000';
          const signalColor = rec.signal === 'BUY' ? '#008000' : rec.signal === 'SELL' ? '#0000cc' : '#666';
          const stratColor = rec.strategy.includes('Long') ? '#000080' : 
                            rec.strategy.includes('Covered') ? '#006600' : 
                            rec.strategy.includes('Cash') ? '#660066' : '#663300';
          
          let extraInfo = '';
          if (rec.yield_pct) extraInfo += \`<div>Yield: <strong>\${rec.yield_pct}%</strong> (annualized: \${rec.annual_yield}%)</div>\`;
          if (rec.collateral) extraInfo += \`<div>Collateral: <strong>$\${rec.collateral.toLocaleString()}</strong></div>\`;
          if (rec.risk_reward) extraInfo += \`<div>Risk/Reward: <strong>\${rec.risk_reward}:1</strong></div>\`;
          if (rec.width) extraInfo += \`<div>Spread Width: <strong>$\${rec.width}</strong> (\${rec.strike} / \${rec.strike_short})</div>\`;
          
          const maxGain = typeof rec.max_gain === 'string' ? rec.max_gain : '$' + rec.max_gain.toLocaleString();
          
          return \`
            <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:4px;background:#fff;">
              <div style="background:\${stratColor};color:#fff;padding:2px 6px;display:flex;justify-content:space-between;">
                <span><strong>\${rec.strategy}</strong> — \${rec.contract}</span>
                <span style="color:\${scoreColor};background:#fff;padding:0 6px;font-weight:bold;">Score: \${rec.score}</span>
              </div>
              <div style="padding:6px;display:flex;gap:12px;flex-wrap:wrap;">
                <div>
                  <div>Strike: <strong>$\${rec.strike.toFixed(2)}</strong></div>
                  <div>Exp: <strong>\${rec.expiration}</strong> (\${rec.dte}d)</div>
                  <div>Premium: <strong>$\${rec.premium.toFixed(2)}</strong> ($\${rec.premium_total.toFixed(2)}/contract)</div>
                  <div>IV: <strong>\${rec.iv.toFixed(1)}%</strong></div>
                  \${extraInfo}
                </div>
                <div>
                  <div>Break-even: <strong>$\${rec.breakeven.toFixed(2)}</strong></div>
                  <div style="color:#008000;">Max Gain: <strong>\${maxGain}</strong></div>
                  <div style="color:#cc0000;">Max Loss: <strong>$\${rec.max_loss.toLocaleString()}</strong></div>
                  <div>P(Profit): <strong>\${rec.pop.toFixed(1)}%</strong></div>
                </div>
                <div>
                  <div>Δ \${rec.delta.toFixed(3)} | Θ \${rec.theta.toFixed(4)}</div>
                  <div>Vol: \${(rec.volume||0).toLocaleString()} | OI: \${(rec.open_interest||0).toLocaleString()}</div>
                  <div>EV: <strong>\${rec.ev.toFixed(4)}</strong></div>
                  <div>Signal: <strong style="color:\${signalColor};">\${rec.signal}</strong></div>
                </div>
              </div>
            </div>\`;
        }).join('');
      }
      
      // Filter buttons
      el.querySelectorAll('.rec-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.rec-filter').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFilter = btn.dataset.f;
          renderRecs();
        });
      });
      
      async function screen() {
        const sym = symInput.value.trim().toUpperCase();
        if (!sym) return;
        status.textContent = 'Screening all strategies...';
        results.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">Analyzing options chain for all L2 strategies...</div>';
        try {
          const r = await fetch(\`/api/recommendations/\${sym}?risk=\${riskSelect.value}\`);
          const data = await r.json();
          if (data.error) throw new Error(data.error);
          allRecs = data.recommendations;
          const strategies = [...new Set(allRecs.map(r => r.strategy))];
          status.textContent = \`\${data.count} picks across \${strategies.length} strategies • Spot: $\${data.spot_price}\`;
          renderRecs();
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
