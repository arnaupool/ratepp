// Same-origin API client: every path is relative (/api/...), so the app works
// unchanged behind any host or reverse proxy.

const TOKEN_KEY = 'puntuaciones_token';
const TIMEOUT_MS = 10_000;

export const NETWORK_ERROR_MESSAGE = 'No se puede conectar con el servidor';

/** The server couldn't be reached at all (offline, no VPN, timeout). */
export class NetworkError extends Error {
  constructor() {
    super(NETWORK_ERROR_MESSAGE);
    this.name = 'NetworkError';
  }
}

/** The server answered with an error; `message` is its Spanish `error` text. */
export class ApiError extends Error {
  status: number;
  /** False when the server sent no `error` text (the message is generic). */
  fromServer: boolean;
  constructor(status: number, message: string, fromServer = true) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fromServer = fromServer;
  }
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let token: string | null = readToken();

export function getToken() {
  return token;
}

export function setToken(next: string | null) {
  token = next;
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the session just won't survive a reload */
  }
}

// Any 401 means the token is invalid or expired; the auth layer subscribes
// to this to drop the session and go back to Acceder.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onUnauthorized(fn: UnauthorizedListener) {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  timeoutMs?: number;
}

async function request<T>(path: string, { method = 'GET', body, form, timeoutMs = TIMEOUT_MS }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body: a proxy error page, or no body at all.
  }

  if (!res.ok) {
    // A proxy in front answering 502/503/504 means our server is down.
    if (res.status >= 502 && res.status <= 504 && !(data && typeof data === 'object' && 'error' in data)) {
      throw new NetworkError();
    }
    if (res.status === 401 && token) unauthorizedListeners.forEach((fn) => fn());
    const serverMessage = (data as { error?: string } | null)?.error;
    throw new ApiError(res.status, serverMessage || `Error de red (${res.status})`, !!serverMessage);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T = null>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form, timeoutMs: 120_000 }),
};

// The server's Spanish message when there is one, otherwise the caller's
// specific fallback ("No se pudo guardar el campo"...).
export function errorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError && !e.fromServer) return fallback;
  return e instanceof Error && e.message ? e.message : fallback;
}
