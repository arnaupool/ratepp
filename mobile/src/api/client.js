export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

async function request(path, { method = 'GET', body, isMultipart = false } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (!isMultipart && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
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
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const form = new FormData();
    form.append('photo', { uri, name: filename, type: mime });

    const data = await request('/api/uploads', { method: 'POST', body: form, isMultipart: true });
    return data.url;
  },
};
