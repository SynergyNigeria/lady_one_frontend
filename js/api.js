// LadySwap — API Helper
const API = {
  async _request(method, path, body = null, token = null) {
    const isFormData = body instanceof FormData;
    const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Token ${token}`;

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
      let data;
      try { data = await res.json(); } catch { data = {}; }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { error: 'Network error — is the server running?' } };
    }
  },

  get:   (path, token)       => API._request('GET',   path, null, token),
  post:  (path, body, token) => API._request('POST',  path, body, token),
  patch: (path, body, token) => API._request('PATCH', path, body, token),
  put:   (path, body, token) => API._request('PUT',   path, body, token),
};

// ---- Session helpers ----
const Session = {
  getOrCreateId() {
    let id = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!id) {
      id = 'sess-' + crypto.randomUUID();
      localStorage.setItem(CONFIG.SESSION_KEY, id);
    }
    return id;
  },
  getSubscriberCode: () => localStorage.getItem(CONFIG.SUBSCRIBER_KEY),
  getSubscriberName: () => localStorage.getItem(CONFIG.SUBSCRIBER_NAME_KEY),
  setSubscriber(code, name) {
    localStorage.setItem(CONFIG.SUBSCRIBER_KEY, code);
    localStorage.setItem(CONFIG.SUBSCRIBER_NAME_KEY, name || 'Member');
  },
  clearSubscriber() {
    localStorage.removeItem(CONFIG.SUBSCRIBER_KEY);
    localStorage.removeItem(CONFIG.SUBSCRIBER_NAME_KEY);
    localStorage.removeItem('ls_booking_verified_pass');
  },
  getAdminToken: () => localStorage.getItem(CONFIG.ADMIN_TOKEN_KEY),
  setAdminToken: (token) => localStorage.setItem(CONFIG.ADMIN_TOKEN_KEY, token),
  clearAdminToken: () => localStorage.removeItem(CONFIG.ADMIN_TOKEN_KEY),
};

// ---- Toast ----
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toastContainer');
  },
  show(message, type = 'info', duration = 4000) {
    if (!this.container) return;
    const icons = { success: 'circle-check-big', error: 'circle-x', info: 'info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon"><i data-lucide="${icons[type] || 'info'}"></i></span><span>${message}</span>`;
    this.container.appendChild(el);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 350);
    }, duration);
  },
};

// ---- Format date ----
function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

