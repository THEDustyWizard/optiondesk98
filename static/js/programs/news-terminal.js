/* News Terminal.exe — Financial news feed */
(function() {
  window.NewsTerminal = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;font-size:11px;">
          <div style="display:flex;gap:4px;margin-bottom:4px;">
            <button class="nt-refresh" style="padding:2px 8px;">🔄 Refresh</button>
            <span class="nt-status" style="color:#888;align-self:center;"></span>
          </div>
          <div class="nt-feed" style="overflow:auto;max-height:calc(100% - 28px);"></div>
        </div>`;
      
      const feed = el.querySelector('.nt-feed');
      const status = el.querySelector('.nt-status');
      
      async function load() {
        status.textContent = 'Loading news...';
        try {
          const r = await fetch('/api/news');
          const data = await r.json();
          if (data.error) throw new Error(data.error);
          status.textContent = data.count + ' articles • ' + new Date().toLocaleTimeString();
          feed.innerHTML = data.articles.map(a => `
            <div style="border-bottom:1px solid #ddd;padding:6px 4px;">
              <div><a href="${a.url}" target="_blank" style="color:#000080;font-weight:bold;text-decoration:none;">${a.title}</a></div>
              <div style="color:#666;font-size:10px;margin-top:2px;">${a.source} • ${a.date}</div>
            </div>`).join('');
        } catch(e) {
          status.textContent = 'Using fallback feeds';
          feed.innerHTML = `
            <div style="padding:8px;text-align:center;color:#888;">
              <p>Live news feed requires server-side RSS parsing.</p>
              <p style="margin-top:8px;"><strong>Quick Links:</strong></p>
              <p><a href="https://finance.yahoo.com/news/" target="_blank" style="color:#000080;">Yahoo Finance News</a></p>
              <p><a href="https://www.cnbc.com/markets/" target="_blank" style="color:#000080;">CNBC Markets</a></p>
              <p><a href="https://www.bloomberg.com/markets" target="_blank" style="color:#000080;">Bloomberg</a></p>
              <p><a href="https://www.reuters.com/business/finance/" target="_blank" style="color:#000080;">Reuters Finance</a></p>
            </div>`;
        }
      }
      
      el.querySelector('.nt-refresh').addEventListener('click', load);
      load();
    }
  };
})();
