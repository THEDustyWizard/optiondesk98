/* Live TV.exe — YouTube live stream embeds */
(function() {
  const CHANNELS = [
    { name: "Bloomberg TV", url: "https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ68-rmLjXEA&autoplay=1&mute=1", icon: "📺" },
    { name: "Fox Business", url: "https://www.youtube.com/embed/live_stream?channel=UCceiyyOA0vEwdJkMHGOcMzg&autoplay=1&mute=1", icon: "📺" },
    { name: "CNBC", url: "https://www.youtube.com/embed/live_stream?channel=UCvJJ_dzjViJCoLf5uKUTwoA&autoplay=1&mute=1", icon: "📺" },
    { name: "Yahoo Finance", url: "https://www.youtube.com/embed/live_stream?channel=UCEAZeUIeJs0IjQiqTCdVSIg&autoplay=1&mute=1", icon: "📺" },
  ];
  
  // Fallback direct links if embeds fail
  const DIRECT_LINKS = {
    "Bloomberg TV": "https://www.youtube.com/@bloombergtv/live",
    "Fox Business": "https://www.youtube.com/@FoxBusiness/live",
    "CNBC": "https://www.youtube.com/@CNBCtelevision/live",
    "Yahoo Finance": "https://www.youtube.com/@YahooFinance/live",
  };
  
  window.LiveTV = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;font-size:11px;">
          <div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;">
            ${CHANNELS.map((c, i) => `<button class="tv-ch ${i===0?'active':''}" data-idx="${i}" style="padding:2px 8px;">${c.icon} ${c.name}</button>`).join('')}
          </div>
          <div class="tv-player" style="background:#000;border:2px solid;border-color:#808080 #fff #fff #808080;position:relative;width:100%;padding-bottom:56.25%;">
            <iframe class="tv-iframe" src="${CHANNELS[0].url}" frameborder="0" allow="autoplay;encrypted-media" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"></iframe>
          </div>
          <div style="margin-top:6px;padding:4px;border:2px solid;border-color:#808080 #fff #fff #808080;background:#ffffcc;">
            <strong>💡 Tip:</strong> If embed doesn't load, click the direct link below:
            <div class="tv-direct" style="margin-top:4px;">
              ${CHANNELS.map(c => `<a href="${DIRECT_LINKS[c.name]}" target="_blank" style="color:#000080;margin-right:12px;">${c.name} ↗</a>`).join('')}
            </div>
          </div>
        </div>`;
      
      const iframe = el.querySelector('.tv-iframe');
      el.querySelectorAll('.tv-ch').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.tv-ch').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const ch = CHANNELS[parseInt(btn.dataset.idx)];
          iframe.src = ch.url;
        });
      });
    }
  };
})();
WM.registerProgram('live-tv', (containerId) => window.LiveTV && window.LiveTV.init(containerId));
