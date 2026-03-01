/* Program Loader — hooks into WM to init program UIs */
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

  const origCreate = WM.create.bind(WM);
  WM.create = function(id, icon, title) {
    origCreate(id, icon, title);
    const initFn = PROGRAM_INIT[id];
    if (initFn) setTimeout(initFn, 50);
  };
})();
