// LadySwap — Verify Booking Logic
(function () {
  'use strict';

  // Ensure API, Session, CONFIG are loaded
  if (!window.API || !window.Session || !window.CONFIG) {
    alert('Required scripts not loaded.');
    return;
  }

  const code = Session.getSubscriberCode();
  if (!code) {
    window.location.href = 'welcome.html';
    return;
  }

  const verifyWarning = document.getElementById('verifyWarning');
  const proceedBtn = document.getElementById('proceedBtn');
  const verifyMsg = document.querySelector('.verify-message');

  async function checkVerification() {
    verifyMsg.textContent = 'Checking your booking code status...';
    verifyWarning.style.display = 'none';
    proceedBtn.classList.remove('visible');

    const res = await API.post('/verify-code/', { code });
    if (!res.ok || !res.data.valid) {
      Session.clearSubscriber();
      verifyMsg.textContent = 'Invalid or expired code. Redirecting...';
      setTimeout(() => window.location.href = 'welcome.html', 1800);
      return;
    }

    if (!res.data.verified_by_admin) {
      verifyWarning.style.display = 'block';
      proceedBtn.classList.add('visible');
      verifyMsg.textContent = 'Your booking code is not yet verified.';
    } else {
      verifyMsg.textContent = 'Code verified! Redirecting to dashboard...';
      setTimeout(() => window.location.href = 'dashboard.html', 1200);
    }
  }

  proceedBtn.onclick = function() {
    window.location.href = 'insurance.html?auto=1';
  };

  // Run check on load
  checkVerification();
})();
