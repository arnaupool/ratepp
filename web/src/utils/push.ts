import { pushApi } from '../api/endpoints';

// Notifications on this device (docs/avisos.md): the browser's push
// subscription, saved on the server for the signed-in account.

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

// The service worker may still be installing on the first visit.
async function registration() {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('La app aún se está preparando: recarga la página y vuelve a intentarlo')), 10000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Where this device stands; when it is on, re-saves the subscription for this account. */
export async function pushState(): Promise<PushState> {
  // iPhone only offers push to the app added to the home screen.
  if (isIos() && !standalone()) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub || Notification.permission !== 'granted') return 'off';
  await pushApi.subscribe(sub.toJSON()).catch(() => {});
  return 'on';
}

export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  const { publicKey } = await pushApi.key();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
  await pushApi.subscribe(sub.toJSON());
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await pushApi.unsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  }
  return 'off';
}

/**
 * Signing out stops this device's notifications without a request (the
 * session is already gone): the push service then reports the subscription
 * as expired and the server drops it.
 */
export function dropPushOnLogout() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .getRegistration()
    .then((reg) => reg?.pushManager?.getSubscription())
    .then((sub) => sub?.unsubscribe())
    .catch(() => {});
}
