(function () {
  const MESSAGES = [
    "Starting OptionDesk 98...",
    "Loading Market Data Engine...",
    "Initializing Greeks Coprocessor...",
    "Calibrating Black-Scholes Model...",
    "Connecting to data providers...",
    "Building desktop environment...",
    "Ready."
  ];

  // Synth startup chime via Web Audio
  function playStartupSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.6);
      });
    } catch (e) { /* no audio, no problem */ }
  }

  // Phase 1: BIOS (2.5s)
  setTimeout(() => {
    document.getElementById("bios-screen").classList.remove("active");
    document.getElementById("loading-screen").classList.add("active");
    runProgressBar();
  }, 2500);

  function runProgressBar() {
    const bar = document.getElementById("progress-bar");
    const msg = document.getElementById("loading-msg");
    let progress = 0;
    let msgIdx = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress > 100) progress = 100;
      bar.style.width = progress + "%";
      if (progress > (msgIdx + 1) * (100 / MESSAGES.length) && msgIdx < MESSAGES.length - 1) {
        msgIdx++;
        msg.textContent = MESSAGES[msgIdx];
      }
      if (progress >= 100) {
        clearInterval(interval);
        msg.textContent = "Ready.";
        playStartupSound();
        setTimeout(showWelcome, 800);
      }
    }, 200);
  }

  function showWelcome() {
    document.getElementById("loading-screen").classList.remove("active");
    const ws = document.getElementById("welcome-screen");
    ws.classList.add("active");
    // small delay to trigger opacity transition
    requestAnimationFrame(() => { ws.style.opacity = "1"; });
    setTimeout(() => { window.location.href = "/"; }, 2500);
  }
})();
