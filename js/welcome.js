// LadySwap — Welcome Page Logic
(function () {
  'use strict';

  // ---- State ----
  let sessionId = Session.getOrCreateId();
  let conversationId = null;
  let lastMsgId = 0;
  let pollTimer = null;
  let chatOpen = false;
  const subscribeTrigger = 'i am ready to subscribe';

  // ---- Init ----
  Toast.init();
  if (window.lucide) window.lucide.createIcons();
  window.addEventListener('load', () => {
    if (window.lucide) window.lucide.createIcons();
  });
  startHeroTyping();

  // Track visitor
  API.post('/track/', { page: '/welcome' });

  function startHeroTyping() {
    const el = document.getElementById('typingText');
    if (!el) return;
    let text = el.dataset.text;
    if (!text || !text.trim()) {
      text = "Pay $2000 to subscribe and get Ruby's booking code information.";
    }
    let i = 1;
    const type = () => {
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        i++;
        setTimeout(type, 42);
      } else {
        setTimeout(() => el.classList.add('done'), 900);
      }
    };
    setTimeout(type, 450);
  }

  // If already subscribed, redirect
  const savedCode = Session.getSubscriberCode();
  if (savedCode) {
    verifyAndRedirect(savedCode);
  } else {
    updateNavStatus(false);
  }

  // ---- DOM refs ----
  const subscribeForm   = document.getElementById('subscribeForm');
  const subscribeSuccess = document.getElementById('subscribeSuccess');
  const subscribeAlert  = document.getElementById('subscribeAlert');
  const subscribeBtn    = document.getElementById('subscribeBtn');
  const subscribeBtnTxt = document.getElementById('subscribeBtnText');
  const subscribeSpinner= document.getElementById('subscribeSpinner');
  const generatedCode   = document.getElementById('generatedCode');
  const goToDashBtn     = document.getElementById('goToDashboardBtn');

  const verifyForm      = document.getElementById('verifyForm');
  const verifyAlert     = document.getElementById('verifyAlert');
  const verifyBtn       = document.getElementById('verifyBtn');
  const verifyBtnTxt    = document.getElementById('verifyBtnText');
  const verifySpinner   = document.getElementById('verifySpinner');
  const verifySuccess   = document.getElementById('verifySuccess');
  const verifyWelcome   = document.getElementById('verifyWelcomeText');
  const verifyCountdown = document.getElementById('verifyCountdown');
  const verifyCodeInput = document.getElementById('verifyCode');

  const openChatBtn     = document.getElementById('openChatBtn');
  const closeChatBtn    = document.getElementById('closeChatBtn');
  const chatModal       = document.getElementById('chatModal');
  const chatInput       = document.getElementById('chatInput');
  const chatSendBtn     = document.getElementById('chatSendBtn');
  const chatAttachBtn   = document.getElementById('chatAttachBtn');
  const chatFileInput   = document.getElementById('chatFileInput');
  const chatMessages    = document.getElementById('chatMessages');

  // ---- Subscribe form ----
  subscribeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    openChat('i am ready to subscribe');
  });

  subscribeBtn.addEventListener('click', () => {
    openChat('i am ready to subscribe');
  });

  // Copy code on click
  if (generatedCode) {
    generatedCode.addEventListener('click', () => {
      navigator.clipboard.writeText(generatedCode.textContent).then(() => {
        Toast.show('Code copied to clipboard!', 'success', 2500);
      });
    });
  }

  if (goToDashBtn) {
    goToDashBtn.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  // ---- Verify code form ----
  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(verifyAlert);
    const code = verifyCodeInput.value.trim().toUpperCase();
    if (!code) { showAlert(verifyAlert, 'Please enter your subscriber code.', 'error'); return; }

    setLoading(verifyBtn, verifyBtnTxt, verifySpinner, true, 'Verifying…');
    const res = await API.post('/verify-code/', { code });
    setLoading(verifyBtn, verifyBtnTxt, verifySpinner, false, 'Verify Code');

    if (res.ok && res.data.valid) {
      Session.setSubscriber(res.data.subscriber_code, res.data.name);
      window.location.href = 'verify-booking.html';
    } else {
      showAlert(verifyAlert, res.data.message || res.data.error || 'Invalid code.', 'error');
    }
  });

  // Auto-format code input
  verifyCodeInput.addEventListener('input', (e) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (v.length > 2 && !v.startsWith('LS-')) {
      if (!v.includes('-')) v = 'LS-' + v;
    }
    e.target.value = v.slice(0, 12);
  });

  // ---- Chat ----
  openChatBtn.addEventListener('click', () => openChat());
  closeChatBtn.addEventListener('click', () => closeChat());
  chatModal.addEventListener('click', (e) => { if (e.target === chatModal) closeChat(); });

  chatSendBtn.addEventListener('click', sendMessage);
  chatAttachBtn.addEventListener('click', () => chatFileInput.click());
  chatFileInput.addEventListener('change', sendPhoto);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
  });

  async function openChat(prefillMessage = '') {
    chatModal.classList.add('open');
    chatOpen = true;

    if (!conversationId) {
      const code = Session.getSubscriberCode();
      const res = await API.post('/chat/start/', {
        session_id: sessionId,
        subscriber_code: code || '',
      });
      if (res.ok) conversationId = res.data.conversation_id;
    }
    if (prefillMessage) {
      chatInput.value = prefillMessage;
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    }
    startPolling();
    chatInput.focus();
    scrollToBottom(chatMessages);
  }

  function closeChat() {
    chatModal.classList.remove('open');
    chatOpen = false;
    stopPolling();
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    if (!conversationId) { Toast.show('Chat not connected. Try reopening.', 'error'); return; }

    chatInput.value = '';
    chatInput.style.height = 'auto';

    appendMessage({ content: text, is_from_admin: false, created_at: new Date().toISOString() });
    scrollToBottom(chatMessages);

    if (isSubscribeTrigger(text)) showTypingIndicator();
    const res = await API.post(`/chat/${sessionId}/messages/`, { content: text });
    hideTypingIndicator();
    if (res.ok) {
      if (res.data.id && res.data.id > lastMsgId) lastMsgId = res.data.id;
      await fetchNewMessages();
    } else {
      Toast.show(res.data.error || 'Failed to send message.', 'error');
    }
  }

  async function sendPhoto() {
    const file = chatFileInput.files && chatFileInput.files[0];
    chatFileInput.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Toast.show('Please select an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Toast.show('Image is too large. Max size is 5MB.', 'error');
      return;
    }
    if (!conversationId) await openChat();
    if (!conversationId) { Toast.show('Chat not connected. Try reopening.', 'error'); return; }

    const previewUrl = URL.createObjectURL(file);
    appendMessage({
      content: '',
      attachment_url: previewUrl,
      is_from_admin: false,
      created_at: new Date().toISOString(),
    });
    scrollToBottom(chatMessages);

    const form = new FormData();
    form.append('attachment', file);
    const res = await API.post(`/chat/${sessionId}/messages/`, form);
    if (res.ok) {
      if (res.data.id && res.data.id > lastMsgId) lastMsgId = res.data.id;
    } else {
      Toast.show(res.data.error || 'Failed to send photo.', 'error');
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(fetchNewMessages, CONFIG.CHAT_POLL_MS);
  }
  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  async function fetchNewMessages() {
    if (!sessionId || !chatOpen) return;
    const res = await API.get(`/chat/${sessionId}/messages/?last_id=${lastMsgId}`);
    if (res.ok && res.data.messages && res.data.messages.length) {
      res.data.messages.forEach(m => {
        if (m.id > lastMsgId) {
          lastMsgId = m.id;
          // Don't re-render already optimistically shown user messages
          if (m.is_from_admin || !isOptimistic(m)) {
            appendMessage(m);
          }
        }
      });
      scrollToBottom(chatMessages);
    }
  }

  // Track optimistically added messages by content+time to avoid duplicates
  const optimistic = new Set();
  function isOptimistic(m) { return optimistic.has(m.content); }

  function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.is_from_admin ? 'admin' : 'user'}`;
    const photo = msg.attachment_url
      ? `<a href="${escAttr(msg.attachment_url)}" target="_blank" rel="noopener"><img class="chat-photo" src="${escAttr(msg.attachment_url)}" alt="Uploaded photo"></a>`
      : '';
    const text = msg.content ? `<span class="message-text">${escHtml(msg.content)}</span>` : '';
    div.innerHTML = `
      <div class="message-bubble${photo ? ' has-photo' : ''}">${photo}${text}</div>
      <div class="message-time">${fmtTime(msg.created_at) || 'Just now'}</div>`;
    chatMessages.appendChild(div);
    if (!msg.is_from_admin) optimistic.add(msg.content);
  }

  function isSubscribeTrigger(text) {
    return text.trim().toLowerCase() === subscribeTrigger;
  }

  function showTypingIndicator() {
    if (document.getElementById('typingIndicator')) return;
    const div = document.createElement('div');
    div.className = 'message admin typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = `
      <div class="message-bubble typing-bubble">
        <span></span><span></span><span></span>
      </div>`;
    chatMessages.appendChild(div);
    scrollToBottom(chatMessages);
  }

  function hideTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
  }

  function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
  }

  // ---- Helpers ----
  async function verifyAndRedirect(code) {
    const res = await API.post('/verify-code/', { code });
    if (res.ok && res.data.valid) {
      Session.setSubscriber(res.data.subscriber_code, res.data.name);
      window.location.href = 'dashboard.html';
    } else {
      Session.clearSubscriber();
      updateNavStatus(false);
    }
  }

  function updateNavStatus(active, name) {
    const dot  = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (active) {
      dot.classList.remove('inactive');
      text.textContent = `Subscribed${name ? ' — ' + name : ''}`;
    } else {
      dot.classList.add('inactive');
      text.textContent = 'Not subscribed';
    }
  }

  function setLoading(btn, txtEl, spinnerEl, loading, label) {
    btn.disabled = loading;
    txtEl.textContent = label;
    spinnerEl.classList.toggle('hidden', !loading);
  }

  function showAlert(el, msg, type) {
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideAlert(el) { el.classList.add('hidden'); }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) { return escHtml(String(s || '')); }

})();
