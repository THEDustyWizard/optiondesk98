/* ===== OptionDesk 98 — Desktop Shell ===== */
(function () {
  const PROGRAMS = [
    { id: "market-scanner",    icon: "📊", label: "Market Scanner.exe" },
    { id: "options-analyzer",  icon: "🔬", label: "Options Analyzer.exe" },
    { id: "sector-scanner",    icon: "🏭", label: "Sector Scanner.exe" },
    { id: "greeks-lab",        icon: "📈", label: "Greeks Lab.exe" },
    { id: "recommendations",   icon: "💰", label: "Recommendations.exe" },
    { id: "watchlist",         icon: "⭐", label: "Watchlist.exe" },
    { id: "news-terminal",     icon: "📰", label: "News Terminal.exe" },
    { id: "live-tv",           icon: "📺", label: "Live TV.exe" },
    { id: "learning-center",   icon: "🎓", label: "Learning Center.exe" },
    { id: "settings",          icon: "⚙️", label: "Settings.exe" },
    { id: "portfolio",         icon: "📁", label: "Portfolio.exe" },
    { id: "notepad",           icon: "📝", label: "Notepad.exe" },
    { id: "recycle-bin",       icon: "🗑️", label: "Recycle Bin" },
  ];

  // ---- Icons ----
  const grid = document.getElementById("icon-grid");
  let selectedIcon = null;

  PROGRAMS.forEach(prog => {
    const div = document.createElement("div");
    div.className = "desktop-icon";
    div.dataset.id = prog.id;
    div.innerHTML = `<span class="icon-emoji">${prog.icon}</span><span class="icon-label">${prog.label}</span>`;

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      if (selectedIcon) selectedIcon.classList.remove("selected");
      div.classList.add("selected");
      selectedIcon = div;
    });

    div.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      WM.create(prog.id, prog.icon, prog.label);
    });

    grid.appendChild(div);
  });

  // Deselect on desktop click
  document.getElementById("desktop").addEventListener("click", () => {
    if (selectedIcon) { selectedIcon.classList.remove("selected"); selectedIcon = null; }
  });

  // ---- Start Menu ----
  const startBtn = document.getElementById("start-btn");
  const startMenu = document.getElementById("start-menu");

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startBtn.classList.toggle("active");
    startMenu.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    startMenu.classList.remove("open");
    startBtn.classList.remove("active");
  });

  // Start menu items
  const menuItems = document.getElementById("start-menu-items");
  PROGRAMS.filter(p => p.id !== "recycle-bin").forEach(prog => {
    const item = document.createElement("div");
    item.className = "menu-item";
    item.innerHTML = `<span class="mi-icon">${prog.icon}</span>${prog.label}`;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      WM.create(prog.id, prog.icon, prog.label);
      startMenu.classList.remove("open");
      startBtn.classList.remove("active");
    });
    menuItems.appendChild(item);
  });

  // ---- Clock ----
  const clock = document.getElementById("clock");
  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  updateClock();
  setInterval(updateClock, 30000);

  // ---- Context Menu ----
  const ctx = document.getElementById("context-menu");
  document.getElementById("desktop").addEventListener("contextmenu", (e) => {
    e.preventDefault();
    ctx.style.display = "block";
    ctx.style.left = e.clientX + "px";
    ctx.style.top = e.clientY + "px";
  });
  document.addEventListener("click", () => { ctx.style.display = "none"; });
})();
