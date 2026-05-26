// LadySwap — Global Configuration
const CONFIG = {
  API_BASE: 'http://localhost:8001/api',

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
