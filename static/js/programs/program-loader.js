/* Program Loader — hooks into WM to init program UIs */
(function() {
  const PROGRAM_INIT = {
    'market-scanner': () => window.MarketScanner && window.MarketScanner.init('body-market-scanner'),
    'options-analyzer': () => window.OptionsAnalyzer && window.OptionsAnalyzer.init('body-options-analyzer'),
    'sector-scanner': () => window.SectorScanner && window.SectorScanner.init('body-sector-scanner'),
  };

  // Monkey-patch WM.create to auto-init programs after window creation
  const origCreate = WM.create.bind(WM);
  WM.create = function(id, icon, title) {
    origCreate(id, icon, title);
    const initFn = PROGRAM_INIT[id];
    if (initFn) {
      // Small delay to ensure DOM is ready
      setTimeout(initFn, 50);
    }
  };
})();
