// LadySwap — Verify Booking Logic
(function () {
  'use strict';

  // Ensure API helpers are loaded.
  // These are declared as global lexical bindings, so they are not window.* properties.
  if (typeof API === 'undefined' || typeof Session === 'undefined' || typeof CONFIG === 'undefined') {
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
    if (res.ok && res.data.valid && res.data.verified_by_admin) {
      localStorage.setItem('ls_booking_verified_pass', '1');
      verifyMsg.textContent = 'Code verified! Redirecting to dashboard...';
      setTimeout(() => window.location.href = 'dashboard.html', 1200);
      return;
    }

    if (res.status === 403 && res.data && res.data.code_exists) {
      localStorage.removeItem('ls_booking_verified_pass');
      verifyWarning.style.display = 'block';
      proceedBtn.classList.add('visible');
      verifyMsg.textContent = 'Your booking code is not yet verified.';
      return;
    }

    Session.clearSubscriber();
    localStorage.removeItem('ls_booking_verified_pass');
    verifyMsg.textContent = 'Invalid or expired code. Redirecting...';
    setTimeout(() => window.location.href = 'welcome.html', 1800);
  }

  proceedBtn.onclick = function() {
    window.location.href = 'insurance.html?auto=1';
  };

  // Run check on load
  checkVerification();
})();
