(function () {
  const root = document.documentElement;
  const keyboardThreshold = 80;

  function setViewportVars() {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    const offsetTop = viewport ? viewport.offsetTop : 0;
    const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);

    root.style.setProperty('--app-viewport-height', `${height}px`);
    root.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
    document.body.classList.toggle('keyboard-open', keyboardInset > keyboardThreshold);
  }

  function keepChatComposerVisible(event) {
    const target = event.target;
    if (!target || !target.matches('.chat-input, .admin-chat-input')) return;

    setTimeout(() => {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });

      const chat = target.closest('.chat-window, .admin-chat-main');
      const messages = chat && chat.querySelector('.chat-messages, .admin-messages');
      if (messages) messages.scrollTop = messages.scrollHeight;
    }, 120);
  }

  setViewportVars();
  window.addEventListener('resize', setViewportVars, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(setViewportVars, 250), { passive: true });
  document.addEventListener('focusin', keepChatComposerVisible);
  document.addEventListener('focusout', () => setTimeout(setViewportVars, 120));

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportVars, { passive: true });
    window.visualViewport.addEventListener('scroll', setViewportVars, { passive: true });
  }
})();
