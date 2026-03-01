/* Watchlist.exe — Favorites tracker */
(function() {
  window.Watchlist = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      
      let watchlist = JSON.parse(localStorage.getItem('od98_watchlist') || '["AAPL","MSFT","NVDA","TSLA","SPY"]');
      
      function save() { localStorage.setItem('od98_watchlist', JSON.stringify(watchlist)); }
      
      async function render() {
        el.innerHTML = `
          <div style="padding:4px;font-size:11px;">
            <div style="display:flex;gap:4px;margin-bottom:4px;">
              <input class="wl-add" type="text" placeholder="Add symbol..." style="width:80px;text-transform:uppercase;">
              <button class="wl-add-btn" style="padding:2px 8px;">➕ Add</button>
              <button class="wl-refresh" style="padding:2px 8px;">🔄 Refresh</button>
              <span class="wl-status" style="color:#888;margin-left:auto;align-self:center;"></span>
            </div>
            <div class="wl-list" style="overflow:auto;max-height:calc(100% - 30px);border:2px solid;border-color:#808080 #fff #fff #808080;">
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead><tr style="background:#000080;color:#fff;position:sticky;top:0;">
                  <th style="padding:3px 6px;text-align:left;">Symbol</th>
                  <th style="padding:3px 6px;text-align:right;">Price</th>
                  <th style="padding:3px 6px;text-align:right;">Change</th>
                  <th style="padding:3px 6px;text-align:right;">%</th>
                  <th style="padding:3px 6px;text-align:center;">Action</th>
                </tr></thead>
                <tbody class="wl-body"><tr><td colspan="5" style="text-align:center;padding:20px;">Loading...</td></tr></tbody>
              </table>
            </div>
          </div>`;
        
        const tbody = el.querySelector('.wl-body');
        const status = el.querySelector('.wl-status');
        const addInput = el.querySelector('.wl-add');
        
        el.querySelector('.wl-add-btn').addEventListener('click', () => {
          const sym = addInput.value.trim().toUpperCase();
          if (sym && !watchlist.includes(sym)) { watchlist.push(sym); save(); render(); }
        });
        addInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const sym = addInput.value.trim().toUpperCase();
            if (sym && !watchlist.includes(sym)) { watchlist.push(sym); save(); render(); }
          }
        });
        el.querySelector('.wl-refresh').addEventListener('click', render);
        
        // Fetch quotes
        let rows = '';
        for (const sym of watchlist) {
          try {
            const r = await fetch('/api/quote/' + sym);
            const q = await r.json();
            const color = q.change >= 0 ? '#008000' : '#cc0000';
            const sign = q.change >= 0 ? '+' : '';
            rows += `<tr>
              <td style="padding:2px 6px;font-weight:bold;cursor:pointer;" class="wl-sym" data-sym="${sym}">${sym}</td>
              <td style="padding:2px 6px;text-align:right;">$${q.price.toFixed(2)}</td>
              <td style="padding:2px 6px;text-align:right;color:${color};">${sign}${q.change.toFixed(2)}</td>
              <td style="padding:2px 6px;text-align:right;color:${color};">${sign}${q.change_pct.toFixed(2)}%</td>
              <td style="padding:2px 6px;text-align:center;"><button class="wl-rm" data-sym="${sym}" style="font-size:10px;padding:0 4px;cursor:pointer;">✕</button></td>
            </tr>`;
          } catch(e) {
            rows += `<tr><td style="padding:2px 6px;">${sym}</td><td colspan="4" style="color:red;">Error</td></tr>`;
          }
        }
        tbody.innerHTML = rows || '<tr><td colspan="5" style="text-align:center;padding:20px;">Watchlist empty. Add symbols above.</td></tr>';
        status.textContent = watchlist.length + ' symbols • ' + new Date().toLocaleTimeString();
        
        // Remove buttons
        tbody.querySelectorAll('.wl-rm').forEach(btn => {
          btn.addEventListener('click', () => {
            watchlist = watchlist.filter(s => s !== btn.dataset.sym);
            save(); render();
          });
        });
        // Click symbol to open analyzer
        tbody.querySelectorAll('.wl-sym').forEach(td => {
          td.addEventListener('dblclick', () => {
            WM.create('options-analyzer', '🔬', 'Options Analyzer.exe');
            setTimeout(() => { if (window.OptionsAnalyzer) window.OptionsAnalyzer.loadSymbol(td.dataset.sym); }, 100);
          });
        });
      }
      render();
    }
  };
})();
