/* Live TV.exe — YouTube live stream embeds */
(function() {
  const CHANNELS = [
    { name: "Bloomberg TV", id: "dp8PhLsUcFE", icon: "📺" },
    { name: "Fox Business", id: "oxJkeTrKCpo", icon: "📺" },
    { name: "CNBC", id: "9NyxcX3rhQs", icon: "📺" },
    { name: "Yahoo Finance", id: "dp8PhLsUcFEYF", icon: "📺" },
  ];
  
  window.LiveTV = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;font-size:11px;">
          <div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;">
            ${CHANNELS.map((c, i) => `<button class="tv-ch ${i===0?'active':''}" data-idx="${i}" style="padding:2px 8px;">${c.icon} ${c.name}</button>`).join('')}
          </div>
          <div class="tv-player" style="background:#000;border:2px solid;border-color:#808080 #fff #fff #808080;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;">
            <iframe class="tv-iframe" width="100%" height="100%" src="https://www.youtube.com/embed/${CHANNELS[0].id}?autoplay=1&mute=1" frameborder="0" allow="autoplay;encrypted-media" allowfullscreen style="border:none;"></iframe>
          </div>
          <div style="margin-top:4px;color:#888;text-align:center;">Click a channel above to switch. Streams may require YouTube availability.</div>
        </div>`;
      
      const iframe = el.querySelector('.tv-iframe');
      el.querySelectorAll('.tv-ch').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.tv-ch').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const ch = CHANNELS[parseInt(btn.dataset.idx)];
          iframe.src = `https://www.youtube.com/embed/${ch.id}?autoplay=1&mute=1`;
        });
      });
    }
  };
})();
