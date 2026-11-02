import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import './UpdateBanner.css';

// Registers the service worker (only works over HTTPS or on localhost) and,
// when a new release has been downloaded, offers to reload into it. The
// next cold start of the PWA picks it up anyway.
export default function UpdateBanner() {
  const [update, setUpdate] = useState<null | (() => void)>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => updateSW(true));
      },
      onRegisteredSW(_url, reg) {
        registration = reg;
      },
    });
    // An installed PWA can stay open for days: look for a new version
    // whenever it comes back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!update) return null;
  return (
    <div className="update-banner" role="status">
      <span>Hay una versión nueva</span>
      <button type="button" onClick={update}>
        Recargar
      </button>
    </div>
  );
}
