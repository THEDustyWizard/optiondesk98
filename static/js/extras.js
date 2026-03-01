/* ===== OptionDesk 98 — Extras: Shutdown, Properties, Recycle Bin, Keyboard Shortcuts, Help ===== */
(function() {
  
  // ---- Shutdown Animation ----
  const shutdownBtn = document.getElementById('shutdown-btn');
  const shutdownOverlay = document.getElementById('shutdown-overlay');
  
  shutdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    document.getElementById('start-btn').classList.remove('active');
    document.getElementById('desktop').style.transition = 'opacity 1s';
    document.getElementById('taskbar').style.transition = 'opacity 1s';
    document.getElementById('desktop').style.opacity = '0';
    document.getElementById('taskbar').style.opacity = '0';
    setTimeout(() => { shutdownOverlay.classList.add('active'); }, 1200);
  });
  
  shutdownOverlay.addEventListener('click', () => { window.location.href = '/boot'; });
  
  // ---- Display Properties ----
  const WALLPAPERS = [
    { name: 'Teal (Default)', bg: '#008080' },
    { name: 'Forest', bg: '#254117' },
    { name: 'Midnight', bg: '#191970' },
    { name: 'Storm', bg: '#2F4F4F' },
    { name: 'Sunset', bg: '#8B4513' },
    { name: 'Matrix', bg: '#001100' },
    { name: 'Ocean', bg: '#006994' },
    { name: 'Wine', bg: '#722F37' },
  ];
  
  let selectedWP = 0;
  const wpContainer = document.getElementById('wallpaper-options');
  
  WALLPAPERS.forEach((wp, i) => {
    const div = document.createElement('div');
    div.className = 'wallpaper-preview' + (i === 0 ? ' selected' : '');
    div.style.backgroundColor = wp.bg;
    div.title = wp.name;
    div.innerHTML = `<div style="padding:4px;color:#fff;font-size:9px;text-shadow:1px 1px #000;">${wp.name}</div>`;
    div.addEventListener('click', () => {
      wpContainer.querySelectorAll('.wallpaper-preview').forEach(p => p.classList.remove('selected'));
      div.classList.add('selected');
      selectedWP = i;
    });
    wpContainer.appendChild(div);
  });
  
  document.getElementById('ctx-properties').addEventListener('click', () => {
    document.getElementById('properties-dialog').classList.add('active');
  });
  
  document.getElementById('wp-apply').addEventListener('click', () => {
    const wp = WALLPAPERS[selectedWP];
    document.getElementById('desktop').style.backgroundColor = wp.bg;
    document.getElementById('properties-dialog').classList.remove('active');
    localStorage.setItem('od98_wallpaper', selectedWP);
  });
  
  // Restore saved wallpaper
  const savedWP = localStorage.getItem('od98_wallpaper');
  if (savedWP !== null) {
    const wp = WALLPAPERS[parseInt(savedWP)];
    if (wp) { document.getElementById('desktop').style.backgroundColor = wp.bg; selectedWP = parseInt(savedWP); }
  }
  
  // ---- Recycle Bin ----
  let recycleBin = JSON.parse(localStorage.getItem('od98_recycle') || '[]');
  
  function updateRecycleBin() {
    const content = document.getElementById('recycle-content');
    const items = document.getElementById('recycle-items');
    if (recycleBin.length === 0) {
      content.textContent = 'The Recycle Bin is empty.';
      items.innerHTML = '';
    } else {
      content.textContent = `${recycleBin.length} item(s) in the Recycle Bin:`;
      items.innerHTML = recycleBin.map((item, i) =>
        `<div style="padding:2px 4px;border-bottom:1px solid #ddd;">
          ${item.icon} ${item.name}
          <button onclick="restoreFromBin(${i})" style="float:right;font-size:10px;padding:0 4px;">Restore</button>
        </div>`
      ).join('');
    }
    localStorage.setItem('od98_recycle', JSON.stringify(recycleBin));
  }
  
  window.restoreFromBin = function(idx) { recycleBin.splice(idx, 1); updateRecycleBin(); };
  
  // Expose for program-loader
  window._openRecycleBin = function() {
    updateRecycleBin();
    document.getElementById('recycle-dialog').classList.add('active');
  };
  
  document.getElementById('recycle-empty').addEventListener('click', () => {
    recycleBin = [];
    updateRecycleBin();
  });
  
  // ---- Keyboard Shortcuts ----
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      const topWin = [...document.querySelectorAll('.win98-window:not(.inactive)')].pop();
      if (topWin) WM.close(topWin.id.replace('win-', ''));
    }
    if (e.key === 'Escape') {
      document.getElementById('start-menu').classList.remove('open');
      document.getElementById('start-btn').classList.remove('active');
      document.querySelectorAll('.dialog-overlay.active').forEach(d => d.classList.remove('active'));
      document.getElementById('context-menu').style.display = 'none';
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      document.querySelectorAll('.win98-window').forEach(w => WM.minimize(w.id.replace('win-', '')));
    }
  });
  
  // ---- Contextual Help ----
  window.addHelpButton = function(element, topic) {
    const btn = document.createElement('span');
    btn.className = 'help-btn';
    btn.textContent = '?';
    btn.title = 'Learn about: ' + topic;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      WM.create('learning-center', '🎓', 'Learning Center.exe');
    });
    element.appendChild(btn);
    return btn;
  };
})();
