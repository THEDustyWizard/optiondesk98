/* Settings.exe — API keys, risk level, config — saves to server */
(function() {
  window.SettingsApp = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      
      el.innerHTML = `
        <div style="padding:8px;font-size:11px;">
          <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:8px;padding:8px;">
            <div style="font-weight:bold;margin-bottom:6px;color:#000080;">🔌 Data Provider API Keys</div>
            <div style="margin-bottom:6px;">
              <label>Tradier API Key:<br><input class="set-tradier" type="password" style="width:300px;"></label>
              <div style="color:#888;font-size:10px;">Free sandbox: <a href="https://developer.tradier.com/" target="_blank">developer.tradier.com</a></div>
            </div>
            <div style="margin-bottom:6px;">
              <label>Polygon.io API Key:<br><input class="set-polygon" type="password" style="width:300px;"></label>
              <div style="color:#888;font-size:10px;">Free tier: <a href="https://polygon.io/" target="_blank">polygon.io</a></div>
            </div>
            <div style="margin-bottom:6px;">
              <label>Alpha Vantage Key:<br><input class="set-av" type="password" style="width:300px;"></label>
              <div style="color:#888;font-size:10px;">Free: <a href="https://www.alphavantage.co/support/#api-key" target="_blank">alphavantage.co</a></div>
            </div>
          </div>
          
          <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:8px;padding:8px;">
            <div style="font-weight:bold;margin-bottom:6px;color:#000080;">🏦 Schwab Integration (Optional)</div>
            <div style="margin-bottom:6px;">
              <label>Schwab App Key:<br><input class="set-schwab-key" type="password" style="width:300px;"></label>
            </div>
            <div style="margin-bottom:6px;">
              <label>Schwab App Secret:<br><input class="set-schwab-secret" type="password" style="width:300px;"></label>
            </div>
            <div style="color:#888;font-size:10px;">Register at <a href="https://developer.schwab.com/" target="_blank">developer.schwab.com</a>. Enables real portfolio data.</div>
          </div>
          
          <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:8px;padding:8px;">
            <div style="font-weight:bold;margin-bottom:6px;color:#000080;">⚙️ Preferences</div>
            <div style="margin-bottom:4px;">
              <label>Default Risk Level: 
                <select class="set-risk">
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </label>
            </div>
            <div style="margin-bottom:4px;">
              <label>Monte Carlo Simulations: 
                <input class="set-mc" type="number" value="10000" style="width:80px;">
              </label>
            </div>
          </div>
          
          <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:8px;padding:8px;">
            <div style="font-weight:bold;margin-bottom:6px;color:#000080;">📊 Data Source Status</div>
            <div class="set-health" style="color:#888;">Checking...</div>
          </div>
          
          <button class="set-save" style="padding:4px 16px;font-weight:bold;">💾 Save Settings</button>
          <span class="set-msg" style="margin-left:8px;"></span>
        </div>`;
      
      // Load settings from server
      fetch('/api/settings').then(r => r.json()).then(s => {
        if (s.tradier_key) el.querySelector('.set-tradier').value = s.tradier_key;
        if (s.polygon_key) el.querySelector('.set-polygon').value = s.polygon_key;
        if (s.av_key) el.querySelector('.set-av').value = s.av_key;
        if (s.schwab_key) el.querySelector('.set-schwab-key').value = s.schwab_key;
        if (s.schwab_secret) el.querySelector('.set-schwab-secret').value = s.schwab_secret;
        if (s.risk) el.querySelector('.set-risk').value = s.risk;
        if (s.mc_sims) el.querySelector('.set-mc').value = s.mc_sims;
      }).catch(() => {});
      
      // Health check
      fetch('/api/health').then(r => r.json()).then(data => {
        const h = data.data || {};
        const providers = h.providers || {};
        el.querySelector('.set-health').innerHTML = Object.entries(providers).map(([name, status]) => {
          const color = status === 'available' ? '#008000' : '#cc0000';
          const icon = status === 'available' ? '✅' : '❌';
          return `<div>${icon} <strong>${name}</strong>: <span style="color:${color};">${status}</span></div>`;
        }).join('') + `<div style="margin-top:4px;">Active providers: <strong>${h.active_count || 0}</strong></div>`;
      });
      
      // Save to server
      el.querySelector('.set-save').addEventListener('click', async () => {
        const msg = el.querySelector('.set-msg');
        msg.style.color = '#888';
        msg.textContent = 'Saving...';
        const payload = {
          tradier_key: el.querySelector('.set-tradier').value,
          polygon_key: el.querySelector('.set-polygon').value,
          av_key: el.querySelector('.set-av').value,
          schwab_key: el.querySelector('.set-schwab-key').value,
          schwab_secret: el.querySelector('.set-schwab-secret').value,
          risk: el.querySelector('.set-risk').value,
          mc_sims: parseInt(el.querySelector('.set-mc').value) || 10000,
        };
        try {
          const r = await fetch('/api/settings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
          });
          const result = await r.json();
          if (result.error) throw new Error(result.error);
          msg.style.color = '#008000';
          msg.textContent = '✅ Settings saved! API keys applied to data engine.';
          // Refresh health check
          setTimeout(() => {
            fetch('/api/health').then(r => r.json()).then(data => {
              const h = data.data || {};
              const providers = h.providers || {};
              el.querySelector('.set-health').innerHTML = Object.entries(providers).map(([name, status]) => {
                const color = status === 'available' ? '#008000' : '#cc0000';
                const icon = status === 'available' ? '✅' : '❌';
                return `<div>${icon} <strong>${name}</strong>: <span style="color:${color};">${status}</span></div>`;
              }).join('') + `<div style="margin-top:4px;">Active providers: <strong>${h.active_count || 0}</strong></div>`;
            });
          }, 500);
        } catch(e) {
          msg.style.color = '#cc0000';
          msg.textContent = '❌ Error: ' + e.message;
        }
        setTimeout(() => { msg.textContent = ''; }, 5000);
      });
    }
  };
})();
