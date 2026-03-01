/* ===== OptionDesk 98 — Extras: Shutdown, Properties, Recycle Bin, Keyboard Shortcuts, Help ===== */
(function() {
  
  // ---- Shutdown Animation ----
  const shutdownBtn = document.getElementById('shutdown-btn');
  const shutdownOverlay = document.getElementById('shutdown-overlay');
  
  shutdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('start-menu').classList.remove('open');
    document.getElementById('start-btn').classList.remove('active');
    
    // Fade out desktop
    document.getElementById('desktop').style.transition = 'opacity 1s';
    document.getElementById('taskbar').style.transition = 'opacity 1s';
    document.getElementById('desktop').style.opacity = '0';
    document.getElementById('taskbar').style.opacity = '0';
    
    setTimeout(() => {
      shutdownOverlay.classList.add('active');
    }, 1200);
  });
  
  shutdownOverlay.addEventListener('click', () => {
    window.location.href = '/boot';
  });
  
  // ---- Display Properties ----
  const WALLPAPERS = [
    { name: 'Teal (Default)', bg: '#008080', style: '' },
    { name: 'Forest', bg: '#254117', style: '' },
    { name: 'Midnight', bg: '#191970', style: '' },
    { name: 'Storm', bg: '#2F4F4F', style: '' },
    { name: 'Sunset', bg: '#8B4513', style: '' },
    { name: 'Matrix', bg: '#001100', style: 'color: #00ff00;' },
    { name: 'Ocean', bg: '#006994', style: '' },
    { name: 'Wine', bg: '#722F37', style: '' },
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
    const desktop = document.getElementById('desktop');
    desktop.style.backgroundColor = wp.bg;
    if (wp.style) desktop.setAttribute('style', desktop.getAttribute('style') + wp.style);
    document.getElementById('properties-dialog').classList.remove('active');
    localStorage.setItem('od98_wallpaper', selectedWP);
  });
  
  // Restore saved wallpaper
  const savedWP = localStorage.getItem('od98_wallpaper');
  if (savedWP !== null) {
    const wp = WALLPAPERS[parseInt(savedWP)];
    if (wp) {
      document.getElementById('desktop').style.backgroundColor = wp.bg;
      selectedWP = parseInt(savedWP);
    }
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
  
  window.restoreFromBin = function(idx) {
    recycleBin.splice(idx, 1);
    updateRecycleBin();
  };
  
  // Override recycle bin double-click to show dialog
  window.addEventListener('load', () => {
    // Intercept recycle bin open
    const origCreate = WM.create;
    WM.create = function(id, icon, title) {
      if (id === 'recycle-bin') {
        updateRecycleBin();
        document.getElementById('recycle-dialog').classList.add('active');
        return;
      }
      origCreate.call(WM, id, icon, title);
    };
  });
  
  document.getElementById('recycle-empty').addEventListener('click', () => {
    if (recycleBin.length === 0) return;
    recycleBin = [];
    updateRecycleBin();
  });
  
  // ---- Keyboard Shortcuts ----
  document.addEventListener('keydown', (e) => {
    // Alt+F4: close active window
    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      const topWin = [...document.querySelectorAll('.win98-window:not(.inactive)')].pop();
      if (topWin) {
        const id = topWin.id.replace('win-', '');
        WM.close(id);
      }
    }
    
    // Escape: close start menu / dialogs
    if (e.key === 'Escape') {
      document.getElementById('start-menu').classList.remove('open');
      document.getElementById('start-btn').classList.remove('active');
      document.querySelectorAll('.dialog-overlay.active').forEach(d => d.classList.remove('active'));
      document.getElementById('context-menu').style.display = 'none';
    }
    
    // Ctrl+Shift+M: minimize all
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      document.querySelectorAll('.win98-window').forEach(w => {
        const id = w.id.replace('win-', '');
        WM.minimize(id);
      });
    }
  });
  
  // ---- Contextual Help Buttons ----
  // These get injected by program-loader after window content loads
  window.addHelpButton = function(element, topic) {
    const btn = document.createElement('span');
    btn.className = 'help-btn';
    btn.textContent = '?';
    btn.title = 'Learn about: ' + topic;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      WM.create('learning-center', '🎓', 'Learning Center.exe');
      // Could scroll to specific topic in future
    });
    element.appendChild(btn);
    return btn;
  };
  
})();
