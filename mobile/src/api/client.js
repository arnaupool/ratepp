import { Platform } from 'react-native';

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Mutable rather than a fixed constant: the server address is configurable
// at runtime from Settings (this app is meant to be pointed at a
// self-hosted backend on the user's own network, which isn't known at
// build time).
let apiUrl = DEFAULT_API_URL;
export function getApiUrl() {
  return apiUrl;
}
export function setApiUrl(url) {
  apiUrl = url;
}

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

async function request(path, { method = 'GET', body, isMultipart = false } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (!isMultipart && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: isMultipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Error de red (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  uploadPhoto: async (uri) => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      // On web the picker returns a blob:/data: URI; FormData needs a real Blob.
      const blob = await (await fetch(uri)).blob();
      form.append('photo', blob, 'photo.jpg');
    } else {
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      form.append('photo', { uri, name: filename, type: mime });
    }

    const data = await request('/api/uploads', { method: 'POST', body: form, isMultipart: true });
    return data.url;
  },
};
