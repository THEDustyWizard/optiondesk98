/* Notepad.exe — Trade notes with local save */
(function() {
  window.NotepadApp = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      const saved = localStorage.getItem('od98_notepad') || 'Welcome to OptionDesk 98 Notepad!\n\nUse this to track your trade ideas, notes, and observations.\n\n---\n';
      el.innerHTML = `<textarea class="np-text" style="width:100%;height:100%;border:none;resize:none;font-family:'Courier New',monospace;font-size:12px;padding:4px;outline:none;">${saved}</textarea>`;
      const ta = el.querySelector('.np-text');
      ta.addEventListener('input', () => localStorage.setItem('od98_notepad', ta.value));
      // Add timestamp shortcut
      ta.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
          e.preventDefault();
          const stamp = new Date().toLocaleString();
          const pos = ta.selectionStart;
          ta.value = ta.value.slice(0, pos) + '\n[' + stamp + ']\n' + ta.value.slice(pos);
          localStorage.setItem('od98_notepad', ta.value);
        }
      });
    }
  };
})();
WM.registerProgram('notepad', (containerId) => window.NotepadApp && window.NotepadApp.init(containerId));
