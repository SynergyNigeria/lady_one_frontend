// LadySwap — Dashboard Page Logic
(function () {
  'use strict';

  Toast.init();
  if (window.lucide) window.lucide.createIcons();
  window.addEventListener('load', () => {
    if (window.lucide) window.lucide.createIcons();
  });

  const code = Session.getSubscriberCode();
  const name = Session.getSubscriberName();

  // Guard — must be subscribed
  if (!code) {
    window.location.href = 'welcome.html';
    return;
  }

  // ---- DOM refs ----
  const greetingName     = document.getElementById('greetingName');
  const subscriberName   = document.getElementById('subscriberName');
  const subscriberBadge  = document.getElementById('subscriberCodeBadge');
  const dashCode         = document.getElementById('dashCode');
  const dashCodeCopy     = document.getElementById('dashCodeCopy');
  const memberSince      = document.getElementById('memberSince');
  const expiresAt        = document.getElementById('expiresAt');
  const copyCodeBtn      = document.getElementById('copyCodeBtn');
  const chatFab          = document.getElementById('chatFab');
  const chatFabBadge     = document.getElementById('chatFabBadge');
  const chatModal        = document.getElementById('chatModal');
  const closeChatBtn     = document.getElementById('closeChatBtn');
  const chatInput        = document.getElementById('chatInput');
  const chatSendBtn      = document.getElementById('chatSendBtn');
  const chatAttachBtn    = document.getElementById('chatAttachBtn');
  const chatFileInput    = document.getElementById('chatFileInput');
  const chatMessages     = document.getElementById('chatMessages');
  const qaUnreadBadge    = document.getElementById('qaUnreadBadge');

  // Logout buttons
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('logoutBtn2').addEventListener('click', logout);
  document.getElementById('chatFabCard').addEventListener('click', () => openChat());

  // ---- Verify subscription & load info ----
  (async () => {
    const res = await API.post('/verify-code/', { code });
    if (!res.ok || !res.data.valid) {
      Session.clearSubscriber();
      window.location.href = 'welcome.html';
      return;
    }

    const d = res.data;
    Session.setSubscriber(d.subscriber_code, d.name);

    greetingName.textContent      = d.name;
    subscriberName.textContent    = d.name;
    subscriberBadge.textContent   = d.subscriber_code;
    dashCode.textContent          = d.subscriber_code;
    dashCodeCopy.textContent      = d.subscriber_code;
    memberSince.textContent       = fmtDate(null); // not returned; set placeholder
    expiresAt.textContent         = d.expires_at ? fmtDate(d.expires_at) : 'Never';

    // Track visit
    API.post('/track/', { page: '/dashboard' });
  })();

  // ---- Copy code ----
  copyCodeBtn.addEventListener('click', () => copyCode());
  dashCodeCopy.addEventListener('click', () => copyCode());
  function copyCode() {
    navigator.clipboard.writeText(code).then(() => Toast.show('Code copied!', 'success', 2500));
  }

  // ---- Chat ----
  let sessionId = Session.getOrCreateId();
  let conversationId = null;
  let lastMsgId = 0;
  let pollTimer = null;
  let chatOpen = false;
  let unreadCount = 0;
  const subscribeTrigger = 'i am ready to subscribe';

  chatFab.addEventListener('click', () => openChat());
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

  async function openChat() {
    chatModal.classList.add('open');
    chatOpen = true;
    unreadCount = 0;
    updateBadge(0);

    if (!conversationId) {
      const res = await API.post('/chat/start/', {
        session_id: sessionId,
        subscriber_code: code,
      });
      if (res.ok) {
        conversationId = res.data.conversation_id;
        // Load existing messages
        await fetchNewMessages(true);
      }
    }
    startPolling();
    scrollBottom();
  }

  function closeChat() {
    chatModal.classList.remove('open');
    chatOpen = false;
    stopPolling();
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !sessionId) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    appendMessage({ content: text, is_from_admin: false, created_at: new Date().toISOString() });
    scrollBottom();

    if (isSubscribeTrigger(text)) showTypingIndicator();
    const res = await API.post(`/chat/${sessionId}/messages/`, { content: text });
    hideTypingIndicator();
    if (res.ok) {
      if (res.data.id && res.data.id > lastMsgId) lastMsgId = res.data.id;
      await fetchNewMessages(false);
    } else {
      Toast.show(res.data.error || 'Failed to send.', 'error');
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
    scrollBottom();

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
    pollTimer = setInterval(() => fetchNewMessages(false), CONFIG.CHAT_POLL_MS);
  }
  function stopPolling() { clearInterval(pollTimer); pollTimer = null; }

  async function fetchNewMessages(initial = false) {
    if (!sessionId) return;
    const url = `/chat/${sessionId}/messages/?last_id=${initial ? 0 : lastMsgId}`;
    const res = await API.get(url);
    if (!res.ok || !res.data.messages) return;

    res.data.messages.forEach(m => {
      if (m.id > lastMsgId) {
        lastMsgId = m.id;
        appendMessage(m);
        if (m.is_from_admin && !chatOpen) {
          unreadCount++;
          updateBadge(unreadCount);
        }
      }
    });
    if (res.data.messages.length) scrollBottom();
  }

  function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.is_from_admin ? 'admin' : 'user'}`;
    const photo = msg.attachment_url
      ? `<a href="${escAttr(msg.attachment_url)}" target="_blank" rel="noopener"><img class="chat-photo" src="${escAttr(msg.attachment_url)}" alt="Uploaded photo"></a>`
      : '';
    const text = msg.content ? `<span class="message-text">${escHtml(msg.content)}</span>` : '';
    div.innerHTML = `
      <div class="message-bubble${photo ? ' has-photo' : ''}">${photo}${text}</div>
      <div class="message-time">${fmtTime(msg.created_at) || 'Now'}</div>`;
    chatMessages.appendChild(div);
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
    scrollBottom();
  }

  function hideTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
  }

  function updateBadge(n) {
    chatFabBadge.textContent = n;
    chatFabBadge.classList.toggle('hidden', n === 0);
    qaUnreadBadge.textContent = n;
    qaUnreadBadge.classList.toggle('hidden', n === 0);
  }

  function scrollBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function logout() {
    Session.clearSubscriber();
    window.location.href = 'welcome.html';
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) { return escHtml(String(s || '')); }

})();
