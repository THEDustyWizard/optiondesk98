/* Market Scanner.exe — Top volume scanner */
(function() {
  window.MarketScanner = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;">
          <div style="display:flex;gap:4px;margin-bottom:4px;align-items:center;">
            <button class="ms-refresh" style="font-size:11px;padding:2px 8px;">🔄 Refresh</button>
            <span class="ms-status" style="font-size:11px;color:#888;">Loading...</span>
          </div>
          <div class="ms-table-wrap" style="overflow:auto;max-height:calc(100% - 30px);border:2px solid;border-color:#808080 #fff #fff #808080;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead>
                <tr style="background:#000080;color:#fff;position:sticky;top:0;">
                  <th style="padding:3px 6px;text-align:left;cursor:pointer;" data-sort="symbol">Symbol</th>
                  <th style="padding:3px 6px;text-align:right;cursor:pointer;" data-sort="price">Price</th>
                  <th style="padding:3px 6px;text-align:right;cursor:pointer;" data-sort="change">Change</th>
                  <th style="padding:3px 6px;text-align:right;cursor:pointer;" data-sort="change_pct">%</th>
                  <th style="padding:3px 6px;text-align:right;cursor:pointer;" data-sort="volume">Volume</th>
                </tr>
              </thead>
              <tbody class="ms-body"></tbody>
            </table>
          </div>
        </div>`;
      
      const tbody = el.querySelector('.ms-body');
      const status = el.querySelector('.ms-status');
      const refreshBtn = el.querySelector('.ms-refresh');
      let data = [];
      let sortKey = 'volume', sortAsc = false;
      
      async function load() {
        status.textContent = 'Fetching market data...';
        tbody.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:#888;">Loading...</td></tr>';
        try {
          const r = await fetch('/api/scanner?limit=100');
          const json = await r.json();
          if (json.error) throw new Error(json.error);
          data = json.stocks || [];
          status.textContent = `${data.length} stocks • Source: ${json.source} • ${new Date(json.timestamp).toLocaleTimeString()}`;
          render();
        } catch(e) {
          status.textContent = 'Error: ' + e.message;
          tbody.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:red;">Failed to load data. Check API health.</td></tr>';
        }
      }
      
      function render() {
        const sorted = [...data].sort((a,b) => {
          let va = a[sortKey] || 0, vb = b[sortKey] || 0;
          if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb||'').toLowerCase(); }
          return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });
        tbody.innerHTML = sorted.map(s => {
          const color = s.change >= 0 ? '#008000' : '#cc0000';
          const sign = s.change >= 0 ? '+' : '';
          return `<tr style="cursor:pointer;" data-sym="${s.symbol}">
            <td style="padding:2px 6px;font-weight:bold;">${s.symbol}</td>
            <td style="padding:2px 6px;text-align:right;">$${s.price.toFixed(2)}</td>
            <td style="padding:2px 6px;text-align:right;color:${color};">${sign}${s.change.toFixed(2)}</td>
            <td style="padding:2px 6px;text-align:right;color:${color};">${sign}${s.change_pct.toFixed(2)}%</td>
            <td style="padding:2px 6px;text-align:right;">${(s.volume||0).toLocaleString()}</td>
          </tr>`;
        }).join('');
        
        // Click row to open Options Analyzer
        tbody.querySelectorAll('tr[data-sym]').forEach(row => {
          row.addEventListener('dblclick', () => {
            const sym = row.dataset.sym;
            WM.create('options-analyzer', '🔬', 'Options Analyzer.exe');
            setTimeout(() => {
              if (window.OptionsAnalyzer) window.OptionsAnalyzer.loadSymbol(sym);
            }, 100);
          });
        });
      }
      
      // Sort headers
      el.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (sortKey === key) sortAsc = !sortAsc;
          else { sortKey = key; sortAsc = key === 'symbol'; }
          render();
        });
      });
      
      refreshBtn.addEventListener('click', load);
      load();
    }
  };
})();
WM.registerProgram('market-scanner', (containerId) => window.MarketScanner && window.MarketScanner.init(containerId));
