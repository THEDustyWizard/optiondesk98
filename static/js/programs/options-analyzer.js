/* Options Analyzer.exe — Single ticker deep-dive */
(function() {
  window.OptionsAnalyzer = {
    _container: null,
    
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      this._container = el;
      el.innerHTML = `
        <div style="padding:4px;">
          <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
            <label style="font-size:11px;">Symbol:</label>
            <input class="oa-sym" type="text" style="width:80px;font-size:11px;padding:2px 4px;text-transform:uppercase;" placeholder="AAPL" />
            <button class="oa-go" style="font-size:11px;padding:2px 8px;">Analyze</button>
            <select class="oa-exp" style="font-size:11px;padding:1px 4px;"><option>Select expiration</option></select>
            <span class="oa-status" style="font-size:11px;color:#888;margin-left:auto;"></span>
          </div>
          <div class="oa-quote" style="margin-bottom:6px;padding:4px;border:2px solid;border-color:#808080 #fff #fff #808080;background:#ffffcc;display:none;font-size:11px;"></div>
          <div style="display:flex;gap:4px;margin-bottom:4px;">
            <button class="oa-tab active" data-tab="calls" style="font-size:11px;padding:2px 8px;">Calls</button>
            <button class="oa-tab" data-tab="puts" style="font-size:11px;padding:2px 8px;">Puts</button>
          </div>
          <div class="oa-chain-wrap" style="overflow:auto;max-height:calc(100% - 100px);border:2px solid;border-color:#808080 #fff #fff #808080;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead>
                <tr style="background:#000080;color:#fff;position:sticky;top:0;">
                  <th style="padding:3px 4px;text-align:left;">Contract</th>
                  <th style="padding:3px 4px;text-align:right;">Strike</th>
                  <th style="padding:3px 4px;text-align:right;">Last</th>
                  <th style="padding:3px 4px;text-align:right;">Bid</th>
                  <th style="padding:3px 4px;text-align:right;">Ask</th>
                  <th style="padding:3px 4px;text-align:right;">Vol</th>
                  <th style="padding:3px 4px;text-align:right;">OI</th>
                  <th style="padding:3px 4px;text-align:right;">IV</th>
                </tr>
              </thead>
              <tbody class="oa-body"></tbody>
            </table>
          </div>
        </div>`;
      
      const symInput = el.querySelector('.oa-sym');
      const goBtn = el.querySelector('.oa-go');
      const expSelect = el.querySelector('.oa-exp');
      const status = el.querySelector('.oa-status');
      const quoteDiv = el.querySelector('.oa-quote');
      const tbody = el.querySelector('.oa-body');
      let chainData = null;
      let activeTab = 'calls';
      
      const self = this;
      
      async function loadSymbol(sym) {
        if (!sym) return;
        symInput.value = sym.toUpperCase();
        status.textContent = 'Loading...';
        quoteDiv.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="8" style="padding:20px;text-align:center;">Loading...</td></tr>';
        
        try {
          // Quote
          const qr = await fetch('/api/quote/' + sym);
          const quote = await qr.json();
          if (quote.error) throw new Error(quote.error);
          
          const color = quote.change >= 0 ? '#008000' : '#cc0000';
          const sign = quote.change >= 0 ? '+' : '';
          quoteDiv.innerHTML = `<strong>${quote.symbol}</strong> $${quote.price.toFixed(2)} 
            <span style="color:${color}">${sign}${quote.change.toFixed(2)} (${sign}${quote.change_pct.toFixed(2)}%)</span>
            &nbsp;Vol: ${(quote.volume||0).toLocaleString()} &nbsp;Source: ${quote.source}`;
          quoteDiv.style.display = 'block';
          
          // Chain
          const cr = await fetch('/api/options/' + sym);
          chainData = await cr.json();
          if (chainData.error) throw new Error(chainData.error);
          
          // Populate expirations
          expSelect.innerHTML = chainData.expirations.map(e => 
            `<option value="${e}" ${e === chainData.selected_expiration ? 'selected' : ''}>${e}</option>`
          ).join('');
          
          status.textContent = `Source: ${chainData.source} • ${new Date(chainData.timestamp).toLocaleTimeString()}`;
          renderChain();
        } catch(e) {
          status.textContent = 'Error: ' + e.message;
          tbody.innerHTML = `<tr><td colspan="8" style="padding:20px;text-align:center;color:red;">${e.message}</td></tr>`;
        }
      }
      
      function renderChain() {
        if (!chainData) return;
        const options = activeTab === 'calls' ? chainData.calls : chainData.puts;
        tbody.innerHTML = options.map(o => {
          const itmBg = o.in_the_money ? 'background:#e8f5e9;' : '';
          return `<tr style="${itmBg}">
            <td style="padding:2px 4px;font-size:10px;">${o.contract}</td>
            <td style="padding:2px 4px;text-align:right;">$${o.strike.toFixed(2)}</td>
            <td style="padding:2px 4px;text-align:right;">$${o.last.toFixed(2)}</td>
            <td style="padding:2px 4px;text-align:right;">$${o.bid.toFixed(2)}</td>
            <td style="padding:2px 4px;text-align:right;">$${o.ask.toFixed(2)}</td>
            <td style="padding:2px 4px;text-align:right;">${(o.volume||0).toLocaleString()}</td>
            <td style="padding:2px 4px;text-align:right;">${(o.open_interest||0).toLocaleString()}</td>
            <td style="padding:2px 4px;text-align:right;">${(o.iv*100).toFixed(1)}%</td>
          </tr>`;
        }).join('') || '<tr><td colspan="8" style="padding:20px;text-align:center;color:#888;">No options data</td></tr>';
      }
      
      // Tabs
      el.querySelectorAll('.oa-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          el.querySelectorAll('.oa-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          activeTab = tab.dataset.tab;
          renderChain();
        });
      });
      
      // Expiration change
      expSelect.addEventListener('change', async () => {
        const sym = symInput.value.trim();
        const exp = expSelect.value;
        if (!sym || !exp) return;
        status.textContent = 'Loading expiration...';
        try {
          const cr = await fetch(`/api/options/${sym}?expiration=${exp}`);
          chainData = await cr.json();
          renderChain();
          status.textContent = `Source: ${chainData.source}`;
        } catch(e) { status.textContent = 'Error: ' + e.message; }
      });
      
      goBtn.addEventListener('click', () => loadSymbol(symInput.value.trim()));
      symInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadSymbol(symInput.value.trim()); });
      
      // Expose for cross-window linking
      self.loadSymbol = loadSymbol;
    }
  };
})();
