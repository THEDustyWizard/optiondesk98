/* Settings.exe — API keys, risk level, config */
(function() {
  window.SettingsApp = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      
      const settings = JSON.parse(localStorage.getItem('od98_settings') || '{}');
      
      el.innerHTML = `
        <div style="padding:8px;font-size:11px;">
          <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:8px;padding:8px;">
            <div style="font-weight:bold;margin-bottom:6px;color:#000080;">🔌 API Configuration</div>
            <div style="margin-bottom:4px;">
              <label>Tradier API Key:<br><input class="set-tradier" type="password" style="width:300px;" value="${settings.tradier_key||''}"></label>
            </div>
            <div style="margin-bottom:4px;">
              <label>Polygon API Key:<br><input class="set-polygon" type="password" style="width:300px;" value="${settings.polygon_key||''}"></label>
            </div>
            <div style="margin-bottom:4px;">
              <label>Alpha Vantage Key:<br><input class="set-av" type="password" style="width:300px;" value="${settings.av_key||''}"></label>
            </div>
          </div>
          
          <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:8px;padding:8px;">
            <div style="font-weight:bold;margin-bottom:6px;color:#000080;">⚙️ Preferences</div>
            <div style="margin-bottom:4px;">
              <label>Default Risk Level: 
                <select class="set-risk">
                  <option value="conservative" ${settings.risk==='conservative'?'selected':''}>Conservative</option>
                  <option value="moderate" ${settings.risk!=='conservative'&&settings.risk!=='aggressive'?'selected':''}>Moderate</option>
                  <option value="aggressive" ${settings.risk==='aggressive'?'selected':''}>Aggressive</option>
                </select>
              </label>
            </div>
            <div style="margin-bottom:4px;">
              <label>Monte Carlo Simulations: 
                <input class="set-mc" type="number" value="${settings.mc_sims||10000}" style="width:80px;">
              </label>
            </div>
          </div>
          
          <div style="border:2px solid;border-color:#fff #808080 #808080 #fff;margin-bottom:8px;padding:8px;">
            <div style="font-weight:bold;margin-bottom:6px;color:#000080;">📊 Data Source Status</div>
            <div class="set-health" style="color:#888;">Checking...</div>
          </div>
          
          <button class="set-save" style="padding:4px 16px;font-weight:bold;">💾 Save Settings</button>
          <span class="set-msg" style="margin-left:8px;color:#008000;"></span>
        </div>`;
      
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
      
      el.querySelector('.set-save').addEventListener('click', () => {
        const s = {
          tradier_key: el.querySelector('.set-tradier').value,
          polygon_key: el.querySelector('.set-polygon').value,
          av_key: el.querySelector('.set-av').value,
          risk: el.querySelector('.set-risk').value,
          mc_sims: parseInt(el.querySelector('.set-mc').value) || 10000,
        };
        localStorage.setItem('od98_settings', JSON.stringify(s));
        el.querySelector('.set-msg').textContent = 'Settings saved! Restart app to apply API keys.';
        setTimeout(() => { el.querySelector('.set-msg').textContent = ''; }, 3000);
      });
    }
  };
})();
