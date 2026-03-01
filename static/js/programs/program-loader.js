/* Program Loader — unified WM.create hook for all program init + extras */
(function() {
  const PROGRAM_INIT = {
    'market-scanner': () => window.MarketScanner && window.MarketScanner.init('body-market-scanner'),
    'options-analyzer': () => window.OptionsAnalyzer && window.OptionsAnalyzer.init('body-options-analyzer'),
    'sector-scanner': () => window.SectorScanner && window.SectorScanner.init('body-sector-scanner'),
    'greeks-lab': () => window.GreeksLab && window.GreeksLab.init('body-greeks-lab'),
    'recommendations': () => window.Recommendations && window.Recommendations.init('body-recommendations'),
    'watchlist': () => window.Watchlist && window.Watchlist.init('body-watchlist'),
    'news-terminal': () => window.NewsTerminal && window.NewsTerminal.init('body-news-terminal'),
    'live-tv': () => window.LiveTV && window.LiveTV.init('body-live-tv'),
    'learning-center': () => window.LearningCenter && window.LearningCenter.init('body-learning-center'),
    'settings': () => window.SettingsApp && window.SettingsApp.init('body-settings'),
    'portfolio': () => window.Portfolio && window.Portfolio.init('body-portfolio'),
    'notepad': () => window.NotepadApp && window.NotepadApp.init('body-notepad'),
  };

  const HELP_TOPICS = {
    'market-scanner': 'Volume',
    'options-analyzer': 'Call Option',
    'sector-scanner': 'Volume',
    'greeks-lab': 'Delta (Δ)',
    'recommendations': 'Break-Even',
    'watchlist': 'Volume',
    'portfolio': 'Premium',
  };

  // Save the REAL original WM.create (before any overrides)
  const _realCreate = WM.create.bind(WM);

  // Single override that handles everything
  WM.create = function(id, icon, title) {
    // Recycle bin opens as dialog, not window
    if (id === 'recycle-bin') {
      if (window._openRecycleBin) window._openRecycleBin();
      return;
    }

    // Create the window
    _realCreate(id, icon, title);

    // Initialize the program UI
    const initFn = PROGRAM_INIT[id];
    if (initFn) {
      setTimeout(() => {
        initFn();
        console.log('[ProgramLoader] Initialized:', id);
      }, 50);
    }

    // Inject help button
    const helpTopic = HELP_TOPICS[id];
    if (helpTopic && window.addHelpButton) {
      setTimeout(() => {
        const win = document.getElementById('win-' + id);
        if (win) {
          const statusBar = win.querySelector('.win-statusbar');
          if (statusBar) {
            statusBar.innerHTML += ' ';
            window.addHelpButton(statusBar, helpTopic);
          }
        }
      }, 100);
    }
  };
})();
