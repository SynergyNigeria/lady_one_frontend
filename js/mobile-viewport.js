(function () {
  const root = document.documentElement;
  const keyboardThreshold = 80;
  let pinTimer = null;

  function setViewportVars() {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    const offsetTop = viewport ? viewport.offsetTop : 0;
    const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);

    root.style.setProperty('--app-viewport-height', `${height}px`);
    root.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
    document.body.classList.toggle('keyboard-open', keyboardInset > keyboardThreshold);
    pinActiveChatToLatest({ keepComposerVisible: false });
  }

  function getChatParts(input) {
    const chat = input && input.closest('.chat-window, .admin-chat-main');
    const messages = chat && chat.querySelector('.chat-messages, .admin-messages');
    return { chat, messages };
  }

  function pinChatToLatest(input, options = {}) {
    if (!input || !input.matches('.chat-input, .admin-chat-input')) return;
    const keepComposerVisible = options.keepComposerVisible !== false;
    const isAdminInput = input.matches('.admin-chat-input');
    const { messages } = getChatParts(input);

    clearTimeout(pinTimer);
    pinTimer = setTimeout(() => {
      if (messages) {
        messages.scrollTop = messages.scrollHeight;
      }

      if (keepComposerVisible && !isAdminInput) {
        input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }, 80);
  }

  function pinActiveChatToLatest(options) {
    pinChatToLatest(document.activeElement, options);
  }

  function keepChatComposerVisible(event) {
    pinChatToLatest(event.target, { keepComposerVisible: event.type === 'focusin' });
  }

  setViewportVars();
  window.addEventListener('resize', setViewportVars, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(setViewportVars, 250), { passive: true });
  document.addEventListener('focusin', keepChatComposerVisible);
  document.addEventListener('input', keepChatComposerVisible);
  document.addEventListener('focusout', () => setTimeout(setViewportVars, 120));

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportVars, { passive: true });
    window.visualViewport.addEventListener('scroll', setViewportVars, { passive: true });
  }
})();
