/* Portfolio.exe — Position tracker (manual entry) */
(function() {
  window.Portfolio = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      
      let positions = JSON.parse(localStorage.getItem('od98_portfolio') || '[]');
      function save() { localStorage.setItem('od98_portfolio', JSON.stringify(positions)); }
      
      function render() {
        el.innerHTML = `
          <div style="padding:4px;font-size:11px;">
            <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
              <button class="pf-add" style="padding:2px 8px;">➕ Add Position</button>
              <button class="pf-refresh" style="padding:2px 8px;">🔄 Update Prices</button>
              <span class="pf-status" style="color:#888;margin-left:auto;"></span>
            </div>
            <div class="pf-form" style="display:none;border:2px solid;border-color:#fff #808080 #808080 #fff;padding:6px;margin-bottom:6px;background:#ffffcc;">
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                <label>Symbol: <input class="pf-sym" type="text" style="width:60px;text-transform:uppercase;"></label>
                <label>Type: <select class="pf-type"><option value="stock">Stock</option><option value="call">Call</option><option value="put">Put</option></select></label>
                <label>Qty: <input class="pf-qty" type="number" value="1" style="width:50px;"></label>
                <label>Avg Cost: <input class="pf-cost" type="number" step="0.01" style="width:70px;"></label>
                <button class="pf-save" style="padding:2px 8px;">Save</button>
                <button class="pf-cancel" style="padding:2px 8px;">Cancel</button>
              </div>
            </div>
            <div class="pf-table" style="overflow:auto;border:2px solid;border-color:#808080 #fff #fff #808080;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#000080;color:#fff;position:sticky;top:0;">
                  <th style="padding:3px 6px;text-align:left;">Symbol</th>
                  <th style="padding:3px 6px;">Type</th>
                  <th style="padding:3px 6px;text-align:right;">Qty</th>
                  <th style="padding:3px 6px;text-align:right;">Avg Cost</th>
                  <th style="padding:3px 6px;text-align:right;">Current</th>
                  <th style="padding:3px 6px;text-align:right;">P&L</th>
                  <th style="padding:3px 6px;text-align:center;">Action</th>
                </tr></thead>
                <tbody class="pf-body"></tbody>
                <tfoot class="pf-foot"></tfoot>
              </table>
            </div>
          </div>`;
        
        const form = el.querySelector('.pf-form');
        el.querySelector('.pf-add').addEventListener('click', () => { form.style.display = form.style.display === 'none' ? 'block' : 'none'; });
        el.querySelector('.pf-cancel').addEventListener('click', () => { form.style.display = 'none'; });
        el.querySelector('.pf-save').addEventListener('click', () => {
          positions.push({
            symbol: el.querySelector('.pf-sym').value.trim().toUpperCase(),
            type: el.querySelector('.pf-type').value,
            qty: parseInt(el.querySelector('.pf-qty').value) || 1,
            avg_cost: parseFloat(el.querySelector('.pf-cost').value) || 0,
            current: 0, pnl: 0,
          });
          save(); render();
        });
        el.querySelector('.pf-refresh').addEventListener('click', updatePrices);
        
        renderTable();
      }
      
      async function renderTable() {
        const tbody = el.querySelector('.pf-body');
        const tfoot = el.querySelector('.pf-foot');
        let totalPnl = 0;
        
        let rows = '';
        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          const color = p.pnl >= 0 ? '#008000' : '#cc0000';
          const sign = p.pnl >= 0 ? '+' : '';
          rows += `<tr>
            <td style="padding:2px 6px;font-weight:bold;">${p.symbol}</td>
            <td style="padding:2px 6px;text-align:center;">${p.type}</td>
            <td style="padding:2px 6px;text-align:right;">${p.qty}</td>
            <td style="padding:2px 6px;text-align:right;">$${p.avg_cost.toFixed(2)}</td>
            <td style="padding:2px 6px;text-align:right;">$${(p.current||0).toFixed(2)}</td>
            <td style="padding:2px 6px;text-align:right;color:${color};">${sign}$${p.pnl.toFixed(2)}</td>
            <td style="padding:2px 6px;text-align:center;"><button class="pf-rm" data-idx="${i}" style="font-size:10px;padding:0 4px;">✕</button></td>
          </tr>`;
          totalPnl += p.pnl;
        }
        tbody.innerHTML = rows || '<tr><td colspan="7" style="text-align:center;padding:20px;">No positions. Click "Add Position" to start tracking.</td></tr>';
        
        const footColor = totalPnl >= 0 ? '#008000' : '#cc0000';
        tfoot.innerHTML = positions.length ? `<tr style="border-top:2px solid #808080;font-weight:bold;">
          <td colspan="5" style="padding:3px 6px;">Total P&L</td>
          <td style="padding:3px 6px;text-align:right;color:${footColor};">${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}</td>
          <td></td></tr>` : '';
        
        tbody.querySelectorAll('.pf-rm').forEach(btn => {
          btn.addEventListener('click', () => {
            positions.splice(parseInt(btn.dataset.idx), 1);
            save(); render();
          });
        });
      }
      
      async function updatePrices() {
        const status = el.querySelector('.pf-status');
        status.textContent = 'Updating...';
        for (const p of positions) {
          try {
            const r = await fetch('/api/quote/' + p.symbol);
            const q = await r.json();
            p.current = q.price;
            const multiplier = (p.type === 'call' || p.type === 'put') ? 100 : 1;
            p.pnl = (p.current - p.avg_cost) * p.qty * multiplier;
          } catch(e) { /* skip */ }
        }
        save();
        status.textContent = 'Updated ' + new Date().toLocaleTimeString();
        renderTable();
      }
      
      render();
    }
  };
})();
