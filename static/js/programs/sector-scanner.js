/* Sector Scanner.exe — Defense & Finance sectors */
(function() {
  window.SectorScanner = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;">
          <div style="display:flex;gap:4px;margin-bottom:6px;">
            <button class="ss-tab active" data-sector="defense" style="font-size:11px;padding:2px 10px;">🏭 Defense</button>
            <button class="ss-tab" data-sector="finance" style="font-size:11px;padding:2px 10px;">🏦 Finance</button>
            <button class="ss-refresh" style="font-size:11px;padding:2px 8px;margin-left:auto;">🔄 Refresh</button>
            <span class="ss-status" style="font-size:11px;color:#888;align-self:center;"></span>
          </div>
          <div class="ss-table-wrap" style="overflow:auto;max-height:calc(100% - 36px);border:2px solid;border-color:#808080 #fff #fff #808080;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead>
                <tr style="background:#000080;color:#fff;position:sticky;top:0;">
                  <th style="padding:3px 6px;text-align:left;">Symbol</th>
                  <th style="padding:3px 6px;text-align:right;">Price</th>
                  <th style="padding:3px 6px;text-align:right;">Change</th>
                  <th style="padding:3px 6px;text-align:right;">%</th>
                  <th style="padding:3px 6px;text-align:right;">Volume</th>
                </tr>
              </thead>
              <tbody class="ss-body"></tbody>
            </table>
          </div>
        </div>`;
      
      let activeSector = 'defense';
      const tbody = el.querySelector('.ss-body');
      const status = el.querySelector('.ss-status');
      
      async function load(sector) {
        activeSector = sector;
        status.textContent = 'Loading...';
        tbody.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;">Loading sector data...</td></tr>';
        try {
          const r = await fetch('/api/sector/' + sector);
          const json = await r.json();
          if (json.error) throw new Error(json.error);
          status.textContent = `${json.count} stocks • ${new Date(json.timestamp).toLocaleTimeString()}`;
          tbody.innerHTML = json.stocks.map(s => {
            const color = s.change >= 0 ? '#008000' : '#cc0000';
            const sign = s.change >= 0 ? '+' : '';
            return `<tr style="cursor:pointer;" data-sym="${s.symbol}">
              <td style="padding:2px 6px;font-weight:bold;">${s.symbol}</td>
              <td style="padding:2px 6px;text-align:right;">$${s.price.toFixed(2)}</td>
              <td style="padding:2px 6px;text-align:right;color:${color};">${sign}${s.change.toFixed(2)}</td>
              <td style="padding:2px 6px;text-align:right;color:${color};">${sign}${s.change_pct.toFixed(2)}%</td>
              <td style="padding:2px 6px;text-align:right;">${(s.volume||0).toLocaleString()}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;">No data</td></tr>';
          
          tbody.querySelectorAll('tr[data-sym]').forEach(row => {
            row.addEventListener('dblclick', () => {
              WM.create('options-analyzer', '🔬', 'Options Analyzer.exe');
              setTimeout(() => { if (window.OptionsAnalyzer) window.OptionsAnalyzer.loadSymbol(row.dataset.sym); }, 100);
            });
          });
        } catch(e) {
          status.textContent = 'Error: ' + e.message;
          tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:red;">${e.message}</td></tr>`;
        }
      }
      
      el.querySelectorAll('.ss-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          el.querySelectorAll('.ss-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          load(tab.dataset.sector);
        });
      });
      
      el.querySelector('.ss-refresh').addEventListener('click', () => load(activeSector));
      load('defense');
    }
  };
})();
WM.registerProgram('sector-scanner', (containerId) => window.SectorScanner && window.SectorScanner.init(containerId));
