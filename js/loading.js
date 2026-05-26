// LadySwap — Loading Screen
(function () {
  const progressBar = document.getElementById('progressBar');
  const statusEl    = document.getElementById('loadingStatus');
  const screen      = document.getElementById('loadingScreen');
  const canvas      = document.getElementById('particleCanvas');

  const steps = [
    { pct: 12,  msg: 'Starting booking support...' },
    { pct: 28,  msg: 'Loading support tools...' },
    { pct: 48,  msg: 'Preparing your session...' },
    { pct: 65,  msg: 'Checking access...' },
    { pct: 82,  msg: 'Almost ready...' },
    { pct: 97,  msg: "Welcome to Lady's One Booking Support" },
    { pct: 100, msg: 'Redirecting...' },
  ];
  const initialDelay = 600;
  const redirectDelay = 700;
  const totalLoadTime = 10000 + Math.random() * 5000;
  const stepDelay = Math.max(
    900,
    (totalLoadTime - initialDelay - redirectDelay) / (steps.length - 1)
  );

  // ---- Particle canvas ----
  const ctx = canvas.getContext('2d');
  const particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight + window.innerHeight,
      r: Math.random() * 2.5 + .5,
      speed: Math.random() * .8 + .3,
      opacity: Math.random() * .5 + .2,
      hue: Math.random() > .5 ? 356 : 0,
    });
  }

  let animating = true;
  function drawParticles() {
    if (!animating) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y -= p.speed;
      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  // ---- Progress animation ----
  let stepIdx = 0;
  function runStep() {
    if (stepIdx >= steps.length) return;
    const { pct, msg } = steps[stepIdx];
    progressBar.style.width = pct + '%';
    statusEl.textContent = msg;
    stepIdx++;

    if (stepIdx < steps.length) {
      setTimeout(runStep, stepDelay);
    } else {
      // Redirect after final step
      setTimeout(redirect, redirectDelay);
    }
  }

  function redirect() {
    animating = false;
    screen.classList.add('out');

    // Check if already subscribed
    const code = localStorage.getItem(CONFIG.SESSION_KEY ? CONFIG.SUBSCRIBER_KEY : 'ls_subscriber_code');
    const target = code ? 'dashboard.html' : 'welcome.html';

    setTimeout(() => { window.location.href = target; }, 520);
  }

  setTimeout(runStep, initialDelay);
})();
