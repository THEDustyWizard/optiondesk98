/* News Terminal.exe — Aggregated financial news headlines */
(function() {
  window.NewsTerminal = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;font-size:11px;">
          <div style="display:flex;gap:4px;margin-bottom:4px;align-items:center;">
            <button class="nt-refresh" style="padding:2px 8px;">🔄 Refresh</button>
            <select class="nt-source" style="font-size:11px;">
              <option value="all">All Sources</option>
              <option value="Yahoo Finance">Yahoo Finance</option>
              <option value="Reuters">Reuters</option>
              <option value="MarketWatch">MarketWatch</option>
              <option value="CNBC">CNBC</option>
            </select>
            <span class="nt-status" style="color:#888;margin-left:auto;"></span>
          </div>
          <div class="nt-ticker" style="background:#000080;color:#00ff00;padding:3px 6px;margin-bottom:4px;font-family:'Courier New',monospace;font-size:11px;overflow:hidden;white-space:nowrap;">
            📰 Loading headlines...
          </div>
          <div class="nt-feed" style="overflow:auto;max-height:calc(100% - 56px);border:2px solid;border-color:#808080 #fff #fff #808080;background:#fff;"></div>
        </div>`;
      
      const feed = el.querySelector('.nt-feed');
      const status = el.querySelector('.nt-status');
      const ticker = el.querySelector('.nt-ticker');
      const sourceFilter = el.querySelector('.nt-source');
      let allArticles = [];
      
      function renderFeed(source) {
        const filtered = source === 'all' ? allArticles : allArticles.filter(a => a.source === source);
        feed.innerHTML = filtered.map(a => `
          <div style="border-bottom:1px solid #e0e0e0;padding:6px 8px;cursor:pointer;" onmouseover="this.style.background='#e8e8ff'" onmouseout="this.style.background='#fff'">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <a href="${a.url}" target="_blank" style="color:#000080;font-weight:bold;text-decoration:none;flex:1;">${a.title}</a>
            </div>
            <div style="color:#888;font-size:10px;margin-top:2px;">
              <span style="background:#e0e0e0;padding:1px 4px;margin-right:4px;">${a.source}</span>
              ${a.date}
            </div>
          </div>`).join('') || '<div style="text-align:center;padding:20px;color:#888;">No articles found.</div>';
      }
      
      async function load() {
        status.textContent = 'Fetching headlines...';
        ticker.textContent = '📰 Loading...';
        feed.innerHTML = '<div style="text-align:center;padding:20px;">Loading news feeds...</div>';
        
        try {
          const r = await fetch('/api/news');
          const data = await r.json();
          
          if (data.error && data.articles.length === 0) {
            // feedparser not installed — show direct links
            status.textContent = 'RSS parser not available';
            ticker.textContent = '📰 Install feedparser for live headlines: pip install feedparser';
            feed.innerHTML = `
              <div style="padding:12px;">
                <p style="margin-bottom:8px;"><strong>Live RSS feeds require feedparser.</strong> Install it:</p>
                <div style="background:#000;color:#0f0;padding:8px;font-family:monospace;margin-bottom:12px;">pip install feedparser</div>
                <p style="font-weight:bold;margin-bottom:8px;">Quick Links:</p>
                <div style="line-height:2;">
                  <a href="https://finance.yahoo.com/news/" target="_blank" style="color:#000080;">📰 Yahoo Finance News</a><br>
                  <a href="https://www.cnbc.com/markets/" target="_blank" style="color:#000080;">📰 CNBC Markets</a><br>
                  <a href="https://www.reuters.com/business/finance/" target="_blank" style="color:#000080;">📰 Reuters Finance</a><br>
                  <a href="https://www.marketwatch.com/" target="_blank" style="color:#000080;">📰 MarketWatch</a><br>
                  <a href="https://www.bloomberg.com/markets" target="_blank" style="color:#000080;">📰 Bloomberg Markets</a>
                </div>
              </div>`;
            return;
          }
          
          allArticles = data.articles || [];
          status.textContent = `${allArticles.length} headlines • ${new Date().toLocaleTimeString()}`;
          
          // Scrolling ticker
          if (allArticles.length > 0) {
            const headlines = allArticles.slice(0, 10).map(a => a.title).join('  ★  ');
            ticker.textContent = '📰 ' + headlines;
            // Auto-scroll ticker
            let scrollPos = 0;
            const tickerInterval = setInterval(() => {
              if (!document.getElementById(containerId)) { clearInterval(tickerInterval); return; }
              scrollPos += 1;
              ticker.scrollLeft = scrollPos;
              if (scrollPos > ticker.scrollWidth - ticker.clientWidth) scrollPos = 0;
            }, 50);
          }
          
          renderFeed('all');
        } catch(e) {
          status.textContent = 'Error: ' + e.message;
          feed.innerHTML = `<div style="text-align:center;padding:20px;color:red;">${e.message}</div>`;
        }
      }
      
      sourceFilter.addEventListener('change', () => renderFeed(sourceFilter.value));
      el.querySelector('.nt-refresh').addEventListener('click', load);
      load();
    }
  };
})();
