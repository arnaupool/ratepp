import { DEFAULT_API_URL, getApiUrl, setApiUrl } from '../api/client';
import { storage } from './storage';

const SERVER_URL_KEY = 'puntuaciones_server_url';

// Applies any previously-saved server override — must run and resolve
// before anything else makes an API call (AuthContext's session check in
// particular), otherwise that first request would go out against the
// build-time default instead of the user's actual server.
export async function loadServerUrlOverride() {
  const stored = await storage.getItemAsync(SERVER_URL_KEY);
  if (stored) setApiUrl(stored);
}

export async function saveServerUrl(url) {
  await storage.setItemAsync(SERVER_URL_KEY, url);
  setApiUrl(url);
}

export async function resetServerUrl() {
  await storage.deleteItemAsync(SERVER_URL_KEY);
  setApiUrl(DEFAULT_API_URL);
}

export { getApiUrl, DEFAULT_API_URL };
