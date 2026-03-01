/* ===== OptionDesk 98 — Window Manager ===== */
const WM = (function () {
  let zIndex = 100;
  let cascadeOffset = 0;
  const windows = {};  // id -> { el, minimized, maximized, prevRect }

  function create(id, icon, title) {
    if (windows[id]) {
      // Already open — restore & focus
      if (windows[id].minimized) restore(id);
      focus(id);
      return;
    }

    cascadeOffset = (cascadeOffset + 1) % 12;
    const x = 100 + cascadeOffset * 24;
    const y = 40 + cascadeOffset * 24;

    const el = document.createElement("div");
    el.className = "win98-window";
    el.id = "win-" + id;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = "560px";
    el.style.height = "400px";
    el.style.zIndex = ++zIndex;

    el.innerHTML = `
      <div class="win-titlebar" data-wid="${id}">
        <span class="win-title-icon">${icon}</span>
        <span class="win-title-text">${title}</span>
        <span class="win-controls">
          <button data-action="min" title="Minimize">_</button>
          <button data-action="max" title="Maximize">□</button>
          <button data-action="close" title="Close">✕</button>
        </span>
      </div>
      <div class="win-menubar">
        <span>File</span><span>Edit</span><span>View</span><span>Help</span>
      </div>
      <div class="win-body" id="body-${id}">
        <div style="text-align:center;padding:60px 20px;color:#888;">
          <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
          <h2 style="margin-bottom:8px;color:#000;">${title}</h2>
          <p>Coming in Phase 2</p>
        </div>
      </div>
      <div class="win-statusbar">Ready</div>
      <div class="resize-handle rh-right"></div>
      <div class="resize-handle rh-bottom"></div>
      <div class="resize-handle rh-corner"></div>
    `;

    document.getElementById("desktop").appendChild(el);
    windows[id] = { el, minimized: false, maximized: false, prevRect: null };

    // Titlebar controls
    el.querySelector(".win-controls").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === "min") minimize(id);
      else if (action === "max") toggleMaximize(id);
      else if (action === "close") close(id);
    });

    // Focus on click
    el.addEventListener("mousedown", () => focus(id));

    // Drag
    initDrag(el, id);

    // Resize
    initResize(el);

    // Add taskbar item
    addTaskbarItem(id, icon, title);
    focus(id);
  }

  function focus(id) {
    if (!windows[id]) return;
    Object.values(windows).forEach(w => w.el.classList.add("inactive"));
    windows[id].el.classList.remove("inactive");
    windows[id].el.style.zIndex = ++zIndex;
    // Update taskbar
    document.querySelectorAll(".taskbar-item").forEach(t => t.classList.remove("active"));
    const tb = document.getElementById("tb-" + id);
    if (tb) tb.classList.add("active");
  }

  function minimize(id) {
    if (!windows[id]) return;
    windows[id].el.style.display = "none";
    windows[id].minimized = true;
    const tb = document.getElementById("tb-" + id);
    if (tb) tb.classList.remove("active");
  }

  function restore(id) {
    if (!windows[id]) return;
    windows[id].el.style.display = "flex";
    windows[id].minimized = false;
    focus(id);
  }

  function toggleMaximize(id) {
    if (!windows[id]) return;
    const w = windows[id];
    if (w.maximized) {
      w.el.classList.remove("maximized");
      if (w.prevRect) {
        w.el.style.left = w.prevRect.left;
        w.el.style.top = w.prevRect.top;
        w.el.style.width = w.prevRect.width;
        w.el.style.height = w.prevRect.height;
      }
      w.maximized = false;
    } else {
      w.prevRect = {
        left: w.el.style.left, top: w.el.style.top,
        width: w.el.style.width, height: w.el.style.height
      };
      w.el.classList.add("maximized");
      w.maximized = true;
    }
  }

  function close(id) {
    if (!windows[id]) return;
    windows[id].el.remove();
    delete windows[id];
    const tb = document.getElementById("tb-" + id);
    if (tb) tb.remove();
  }

  function initDrag(el, id) {
    const titlebar = el.querySelector(".win-titlebar");
    let dragging = false, sx, sy, ox, oy;

    titlebar.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      if (windows[id] && windows[id].maximized) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      el.style.left = (ox + e.clientX - sx) + "px";
      el.style.top = (oy + e.clientY - sy) + "px";
    });

    document.addEventListener("mouseup", () => { dragging = false; });

    // Double-click titlebar to maximize
    titlebar.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      toggleMaximize(id);
    });
  }

  function initResize(el) {
    const handles = el.querySelectorAll(".resize-handle");
    handles.forEach(handle => {
      let resizing = false, sx, sy, sw, sh;
      const isRight = handle.classList.contains("rh-right") || handle.classList.contains("rh-corner");
      const isBottom = handle.classList.contains("rh-bottom") || handle.classList.contains("rh-corner");

      handle.addEventListener("mousedown", (e) => {
        resizing = true;
        sx = e.clientX; sy = e.clientY;
        sw = el.offsetWidth; sh = el.offsetHeight;
        e.preventDefault(); e.stopPropagation();
      });

      document.addEventListener("mousemove", (e) => {
        if (!resizing) return;
        if (isRight) el.style.width = Math.max(320, sw + e.clientX - sx) + "px";
        if (isBottom) el.style.height = Math.max(200, sh + e.clientY - sy) + "px";
      });

      document.addEventListener("mouseup", () => { resizing = false; });
    });
  }

  function addTaskbarItem(id, icon, title) {
    const container = document.getElementById("taskbar-programs");
    const item = document.createElement("div");
    item.className = "taskbar-item active";
    item.id = "tb-" + id;
    item.innerHTML = `<span class="tb-icon">${icon}</span>${title}`;
    item.addEventListener("click", () => {
      if (windows[id] && windows[id].minimized) {
        restore(id);
      } else if (windows[id] && windows[id].el.style.zIndex == zIndex) {
        minimize(id);
      } else {
        focus(id);
      }
    });
    container.appendChild(item);
  }

  return { create, focus, minimize, restore, close };
})();
