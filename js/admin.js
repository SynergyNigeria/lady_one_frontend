// LadySwap — Admin Panel Logic
(function () {
  'use strict';

  Toast.init();
  if (window.lucide) window.lucide.createIcons();
  window.addEventListener('load', () => {
    if (window.lucide) window.lucide.createIcons();
  });
  function renderIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  const loginScreen = document.getElementById('loginScreen');
  const adminApp    = document.getElementById('adminApp');

  let adminToken = Session.getAdminToken();
  let activeSection = 'dashboard';
  let activeConvId = null;
  let convPollTimer = null;
  let statsPollTimer = null;
  let convListPollTimer = null;

  // ---- Boot ----
  if (adminToken) showAdmin();
  else showLogin();

  // ---- LOGIN ----
  function showLogin() {
    loginScreen.classList.remove('hidden');
    adminApp.classList.add('hidden');
  }

  function showAdmin() {
    loginScreen.classList.add('hidden');
    adminApp.classList.remove('hidden');
    loadSection('dashboard');
    startStatsPoll();
    startConvListPoll();
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn     = document.getElementById('loginBtn');
    const btnTxt  = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginSpinner');
    const alert   = document.getElementById('loginAlert');

    alert.classList.add('hidden');
    btn.disabled = true;
    btnTxt.textContent = 'Signing in…';
    spinner.classList.remove('hidden');

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    const res = await API.post('/admin-api/login/', { username, password });

    btn.disabled = false;
    btnTxt.textContent = 'Sign In';
    spinner.classList.add('hidden');

    if (res.ok) {
      Session.setAdminToken(res.data.token);
      adminToken = res.data.token;
      Toast.show(`Welcome, ${res.data.username}!`, 'success');
      showAdmin();
    } else {
      alert.className = 'alert alert-error';
      alert.textContent = res.data.error || 'Login failed.';
      alert.classList.remove('hidden');
    }
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', logout);
  function logout() {
    Session.clearAdminToken();
    adminToken = null;
    stopAllPolls();
    showLogin();
  }

  // ---- Sidebar navigation ----
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      document.querySelectorAll('.nav-item[data-section]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSection(section);
    });
  });

  // Mobile hamburger
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar   = document.getElementById('adminSidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });

  // ---- Section loading ----
  function loadSection(section) {
    activeSection = section;
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');

    if (section === 'dashboard')     loadStats();
    if (section === 'conversations') loadConversations();
    if (section === 'subscribers')   loadSubscribers();
    if (section === 'visitors')      loadVisitors();
    if (section === 'logs')          loadLogs();
  }

  // ---- STATS ----
  async function loadStats() {
    const res = await API.get('/admin-api/stats/', adminToken);
    if (!res.ok) { if (res.status === 401) logout(); return; }

    const d = res.data;
    document.getElementById('statVisitors').textContent    = d.total_visitors;
    document.getElementById('statSubscribers').textContent = d.total_subscribers;
    document.getElementById('statActive').textContent      = d.active_subscribers;
    document.getElementById('statConvOpen').textContent    = d.open_conversations;
    document.getElementById('statUnread').textContent      = d.unread_conversations;
    document.getElementById('statBanned').textContent      = d.banned_visitors;
    document.getElementById('lastUpdated').textContent     = new Date().toLocaleTimeString();

    // Update conversation badge
    if (d.unread_conversations > 0) {
      document.getElementById('convBadge').textContent = d.unread_conversations;
      document.getElementById('convBadge').classList.add('show');
    } else {
      document.getElementById('convBadge').classList.remove('show');
    }
  }

  document.getElementById('refreshStatsBtn').addEventListener('click', loadStats);

  function startStatsPoll() {
    statsPollTimer = setInterval(loadStats, CONFIG.STATS_POLL_MS);
  }

  // ---- CONVERSATIONS ----
  async function loadConversations() {
    const res = await API.get('/admin-api/conversations/', adminToken);
    if (!res.ok) return;

    const list = document.getElementById('convList');
    const empty = document.getElementById('convEmpty');
    const convs = res.data;

    if (!convs.length) {
      list.innerHTML = '';
      list.appendChild(empty);
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = '';

    convs.forEach(c => {
      const el = document.createElement('div');
      el.className = `conv-item${c.unread_by_admin > 0 ? ' unread' : ''}${activeConvId === c.id ? ' active' : ''}`;
      el.dataset.id = c.id;
      const label = c.subscriber_name || c.subscriber_code || c.visitor_ip;
      const preview = c.last_message ? c.last_message.slice(0, 60) : 'No messages yet';
      el.innerHTML = `
        <div class="conv-avatar"><i data-lucide="${c.subscriber_name ? 'user' : 'globe'}"></i></div>
        <div class="conv-info">
          <div class="conv-name">
            ${escHtml(label)}
            ${c.is_resolved ? '<span class="badge badge-secondary" style="font-size:10px">Resolved</span>' : ''}
          </div>
          <div class="conv-preview">${escHtml(preview)}</div>
        </div>
        <div class="conv-meta">
          <div class="conv-time">${fmtDateTime(c.last_message_at)}</div>
          ${c.unread_by_admin > 0 ? `<div class="unread-dot"></div>` : ''}
        </div>`;
      el.addEventListener('click', () => openConversation(c.id, label));
      list.appendChild(el);
    });
    renderIcons();
  }

  document.getElementById('refreshConvBtn').addEventListener('click', loadConversations);

  function startConvListPoll() {
    convListPollTimer = setInterval(() => {
      if (activeSection === 'conversations') loadConversations();
      loadStats(); // Keep badge fresh
    }, CONFIG.ADMIN_POLL_MS);
  }

  // ---- Open conversation ----
  async function openConversation(id, label) {
    activeConvId = id;
    stopConvPoll();

    // Highlight selected
    document.querySelectorAll('.conv-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id == id);
    });

    const placeholder = document.getElementById('chatPlaceholder');
    const content     = document.getElementById('chatContent');
    placeholder.classList.add('hidden');
    content.classList.remove('hidden');

    const res = await API.get(`/admin-api/conversations/${id}/messages/`, adminToken);
    if (!res.ok) { Toast.show('Failed to load conversation.', 'error'); return; }

    const { conversation: conv, messages } = res.data;

    // Header
    const header = document.getElementById('chatDetailHeader');
    header.innerHTML = `
      <div class="conv-avatar"><i data-lucide="${conv.subscriber_name ? 'user' : 'globe'}"></i></div>
      <div>
        <h3 style="font-size:15px;font-weight:600">${escHtml(label)}</h3>
        <p style="font-size:12px;color:var(--text-2)">
          IP: ${conv.visitor_ip || '—'} 
          ${conv.subscriber_code ? `| Code: <span class="mono">${conv.subscriber_code}</span>` : ''}
        </p>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button class="btn btn-sm ${conv.is_resolved ? 'btn-secondary' : 'btn-success'}" id="resolveBtn">
          ${conv.is_resolved ? '<i data-lucide="undo-2"></i> Reopen' : '<i data-lucide="check"></i> Resolve'}
        </button>
      </div>`;

    document.getElementById('resolveBtn').addEventListener('click', () => resolveConv(id));

    // Messages
    const msgContainer = document.getElementById('adminMessages');
    msgContainer.innerHTML = '';
    messages.forEach(m => appendAdminMessage(m));
    msgContainer.scrollTop = msgContainer.scrollHeight;
    renderIcons();

    // Send handler
    const sendBtn   = document.getElementById('adminSendBtn');
    const input     = document.getElementById('adminChatInput');
    sendBtn.onclick = () => sendAdminReply(id);
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(id); }
    };

    startConvPoll(id);
  }

  async function sendAdminReply(id) {
    const input = document.getElementById('adminChatInput');
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';

    const res = await API.post(`/admin-api/conversations/${id}/reply/`, { content: text }, adminToken);
    if (res.ok) {
      appendAdminMessage(res.data);
      document.getElementById('adminMessages').scrollTop = 9999;
    } else {
      Toast.show(res.data.error || 'Failed to send reply.', 'error');
    }
  }

  function appendAdminMessage(msg) {
    const container = document.getElementById('adminMessages');
    const div = document.createElement('div');
    div.className = `message ${msg.is_from_admin ? 'user' : 'admin'}`;
    const photo = msg.attachment_url
      ? `<a href="${escAttr(msg.attachment_url)}" target="_blank" rel="noopener"><img class="chat-photo" src="${escAttr(msg.attachment_url)}" alt="Uploaded photo"></a>`
      : '';
    const text = msg.content ? `<span class="message-text">${escHtml(msg.content)}</span>` : '';
    div.innerHTML = `
      <div class="message-bubble${photo ? ' has-photo' : ''}">${photo}${text}</div>
      <div class="message-time">${msg.is_from_admin ? 'You - ' : ''}${fmtTime(msg.created_at)}</div>`;
    container.appendChild(div);
  }
  async function resolveConv(id) {
    const res = await API.post(`/admin-api/conversations/${id}/resolve/`, {}, adminToken);
    if (res.ok) {
      Toast.show(res.data.is_resolved ? 'Conversation resolved.' : 'Conversation reopened.', 'success');
      loadConversations();
      openConversation(id, ''); // reload header
    }
  }

  let convMsgLastId = 0;
  function startConvPoll(id) {
    convMsgLastId = 0;
    convPollTimer = setInterval(async () => {
      const res = await API.get(`/admin-api/conversations/${id}/messages/`, adminToken);
      if (!res.ok) return;
      const msgs = res.data.messages;
      const newMsgs = msgs.filter(m => m.id > convMsgLastId);
      if (newMsgs.length) {
        newMsgs.forEach(m => {
          convMsgLastId = Math.max(convMsgLastId, m.id);
          appendAdminMessage(m);
        });
        document.getElementById('adminMessages').scrollTop = 9999;
      }
    }, CONFIG.ADMIN_POLL_MS);
  }
  function stopConvPoll() { clearInterval(convPollTimer); convPollTimer = null; }

  // ---- SUBSCRIBERS ----
  async function loadSubscribers() {
    const res = await API.get('/admin-api/subscribers/', adminToken);
    if (!res.ok) return;

    const tbody = document.getElementById('subscribersTbody');
    tbody.innerHTML = '';

    if (!res.data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No subscribers yet.</td></tr>';
      return;
    }

    res.data.forEach((s, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escHtml(s.name)}</td>
        <td>${escHtml(s.email)}</td>
        <td><span class="mono" style="color:var(--primary)">${s.subscriber_code}</span></td>
        <td>${s.is_active && !s.is_expired
          ? '<span class="badge badge-success">Active</span>'
          : s.is_expired
          ? '<span class="badge badge-warning">Expired</span>'
          : '<span class="badge badge-error">Inactive</span>'}</td>
        <td>${fmtDate(s.created_at)}</td>
        <td>${s.expires_at ? fmtDate(s.expires_at) : 'Never'}</td>
        <td>
          <button class="btn btn-sm ${s.is_active ? 'btn-danger' : 'btn-success'}" data-id="${s.id}" data-active="${s.is_active}">
            ${s.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn btn-sm btn-secondary regen-btn" data-id="${s.id}" style="margin-left:4px"><i data-lucide="refresh-cw"></i> Code</button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-active]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id     = btn.dataset.id;
        const active = btn.dataset.active === 'true';
        const res = await API.patch(`/admin-api/subscribers/${id}/`, { is_active: !active }, adminToken);
        if (res.ok) { Toast.show('Subscriber updated.', 'success'); loadSubscribers(); }
        else Toast.show(res.data.error || 'Failed.', 'error');
      });
    });

    tbody.querySelectorAll('.regen-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Regenerate subscriber code? The old code will stop working.')) return;
        const res = await API.post(`/admin-api/subscribers/${btn.dataset.id}/regenerate-code/`, {}, adminToken);
        if (res.ok) { Toast.show(`New code: ${res.data.subscriber_code}`, 'success', 6000); loadSubscribers(); }
        else Toast.show('Failed to regenerate.', 'error');
      });
    });
    renderIcons();
  }

  document.getElementById('refreshSubsBtn').addEventListener('click', loadSubscribers);

  // ---- VISITORS ----
  async function loadVisitors() {
    const res = await API.get('/admin-api/visitors/', adminToken);
    if (!res.ok) return;

    const tbody = document.getElementById('visitorsTbody');
    tbody.innerHTML = '';

    if (!res.data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No visitors yet.</td></tr>';
      return;
    }

    res.data.forEach((v, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><span class="mono">${v.ip_address}</span></td>
        <td>${v.visit_count}</td>
        <td>${fmtDate(v.first_seen)}</td>
        <td>${fmtDate(v.last_seen)}</td>
        <td>${v.has_subscriber ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-secondary">No</span>'}</td>
        <td>${v.is_banned
          ? '<span class="badge badge-error">Banned</span>'
          : '<span class="badge badge-success">OK</span>'}</td>
        <td>
          <button class="btn btn-sm ${v.is_banned ? 'btn-success' : 'btn-danger'} ban-btn"
            data-id="${v.id}" data-ban="${!v.is_banned}">
            ${v.is_banned ? '<i data-lucide="check"></i> Unban' : '<i data-lucide="ban"></i> Ban'}
          </button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.ban-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = btn.dataset.id;
        const ban = btn.dataset.ban === 'true';
        const res = await API.post('/admin-api/ban/', { visitor_id: id, ban }, adminToken);
        if (res.ok) {
          Toast.show(`${res.data.ip} has been ${res.data.is_banned ? 'banned' : 'unbanned'}.`, 'success');
          loadVisitors();
        } else Toast.show('Action failed.', 'error');
      });
    });
    renderIcons();
  }

  document.getElementById('refreshVisitorsBtn').addEventListener('click', loadVisitors);

  // ---- LOGS ----
  async function loadLogs() {
    const res = await API.get('/admin-api/logs/', adminToken);
    if (!res.ok) return;

    const tbody = document.getElementById('logsTbody');
    tbody.innerHTML = '';

    if (!res.data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-loading">No logs yet.</td></tr>';
      return;
    }

    const actionColors = {
      visit: 'secondary', subscribe: 'success', verify: 'primary',
      chat: 'primary', ban: 'error', unban: 'success', deactivate: 'warning',
    };

    res.data.forEach((l, i) => {
      const tr = document.createElement('tr');
      const colorClass = actionColors[l.action] || 'secondary';
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><span class="badge badge-${colorClass}">${l.action}</span></td>
        <td>${fmtDateTime(l.timestamp)}</td>
        <td style="font-size:12px;color:var(--text-2)">${JSON.stringify(l.metadata)}</td>`;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('refreshLogsBtn').addEventListener('click', loadLogs);

  // ---- Stop all polls ----
  function stopAllPolls() {
    clearInterval(statsPollTimer);
    clearInterval(convListPollTimer);
    stopConvPoll();
  }

  // ---- HTML escape ----
  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) { return escHtml(String(s || '')); }

  // ---- Add Subscriber Modal ----
  const addSubscriberBtn = document.getElementById('addSubscriberBtn');
  const addSubscriberModal = document.getElementById('addSubscriberModal');
  const closeAddSubscriberModal = document.getElementById('closeAddSubscriberModal');
  const addSubscriberForm = document.getElementById('addSubscriberForm');
  const addSubscriberAlert = document.getElementById('addSubscriberAlert');
  const subscriberCodeResult = document.getElementById('subscriberCodeResult');
  const generatedSubscriberCode = document.getElementById('generatedSubscriberCode');
  const copySubscriberCodeBtn = document.getElementById('copySubscriberCodeBtn');

  if (addSubscriberBtn) {
    addSubscriberBtn.addEventListener('click', () => {
      addSubscriberModal.classList.remove('hidden');
      addSubscriberForm.reset();
      addSubscriberAlert.classList.add('hidden');
      subscriberCodeResult.classList.add('hidden');
    });
  }
  if (closeAddSubscriberModal) {
    closeAddSubscriberModal.addEventListener('click', () => {
      addSubscriberModal.classList.add('hidden');
    });
  }
  if (addSubscriberForm) {
    addSubscriberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      addSubscriberAlert.classList.add('hidden');
      subscriberCodeResult.classList.add('hidden');
      const name = document.getElementById('subscriberName').value.trim();
      const email = document.getElementById('subscriberEmail').value.trim();
      const btn = document.getElementById('createSubscriberBtn');
      btn.disabled = true;
      btn.textContent = 'Creating…';
      const res = await API.post('/admin-api/subscribers/create/', { name, email }, adminToken);
      btn.disabled = false;
      btn.textContent = 'Create';
      if (res.ok && res.data && res.data.subscriber_code) {
        generatedSubscriberCode.textContent = res.data.subscriber_code;
        subscriberCodeResult.classList.remove('hidden');
        loadSubscribers();
      } else {
        addSubscriberAlert.textContent = res.data && res.data.error ? res.data.error : 'Failed to create subscriber.';
        addSubscriberAlert.className = 'alert alert-error';
        addSubscriberAlert.classList.remove('hidden');
      }
    });
  }
  if (copySubscriberCodeBtn) {
    copySubscriberCodeBtn.addEventListener('click', () => {
      const code = generatedSubscriberCode.textContent;
      if (code) {
        navigator.clipboard.writeText(code);
        Toast.show('Code copied!', 'success');
      }
    });
  }

})();

