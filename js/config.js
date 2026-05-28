// LadySwap - Global Configuration
const LOCAL_API_BASE = 'http://localhost:8001/api';
const PRODUCTION_API_BASE = 'https://YOUR_PYTHONANYWHERE_USERNAME.pythonanywhere.com/api';
const isLocalFrontend = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

const CONFIG = {
  API_BASE: window.LADYSWAP_API_BASE || (isLocalFrontend ? LOCAL_API_BASE : PRODUCTION_API_BASE),

  // LocalStorage keys
  SESSION_KEY:         'ls_session_id',
  SUBSCRIBER_KEY:      'ls_subscriber_code',
  SUBSCRIBER_NAME_KEY: 'ls_subscriber_name',
  ADMIN_TOKEN_KEY:     'ls_admin_token',

  // Polling
  CHAT_POLL_MS:   3000,   // user chat polling interval
  ADMIN_POLL_MS:  4000,   // admin chat polling interval
  STATS_POLL_MS: 15000,   // admin stats polling interval
};

