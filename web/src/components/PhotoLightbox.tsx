import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../hooks/usePresence';
import { useScrollLock } from '../hooks/useScrollLock';
import { normalizeImageUrl } from '../utils/images';
import './PhotoLightbox.css';

const MAX_SCALE = 5;
const DOUBLE_TAP_MS = 280;

interface View {
  scale: number;
  x: number;
  y: number;
}

const RESET: View = { scale: 1, x: 0, y: 0 };

// Full-screen photo viewer: pinch to zoom, double tap to toggle zoom, drag
// to pan while zoomed. Plain pointer events, so it behaves the same with
// touch on iOS and with a mouse/trackpad.
export default function PhotoLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  const { mounted, shown } = usePresence(!!url, 150);
  const [view, setView] = useState<View>(RESET);
  const [animate, setAnimate] = useState(false);
  const lastUrl = useRef(url);
  if (url) lastUrl.current = url;
  useScrollLock(mounted);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; startX: number; startY: number; view: View; moved: boolean } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    if (url) setView(RESET);
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [url, onClose]);

  if (!mounted) return null;

  const begin = () => {
    const pts = [...pointers.current.values()];
    const dist = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { dist, scale: view.scale, startX: pts[0]?.x ?? 0, startY: pts[0]?.y ?? 0, view, moved: gesture.current?.moved ?? false };
  };

  const onDown = (e: ReactPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = null;
    setAnimate(false);
    begin();
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    if (pts.length >= 2 && g.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      g.moved = true;
      setView((v) => ({ ...v, scale: Math.min(Math.max((g.scale * dist) / g.dist, 1), MAX_SCALE) }));
    } else if (pts.length === 1) {
      const dx = pts[0].x - g.startX;
      const dy = pts[0].y - g.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
      if (g.view.scale > 1) setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
    }
  };

  const onUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // One finger lifted from a pinch: continue as a pan from here.
      begin();
      return;
    }
    gesture.current = null;
    setAnimate(true);
    if (g && !g.moved) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        setView((v) => (v.scale > 1 ? RESET : { scale: 2.5, x: 0, y: 0 }));
      } else {
        lastTap.current = now;
      }
      return;
    }
    setView((v) => (v.scale <= 1.01 ? RESET : v));
  };

  const src = normalizeImageUrl(lastUrl.current);

  return createPortal(
    <div className={`lightbox${shown ? ' shown' : ''}`} role="dialog" aria-modal="true" aria-label="Foto">
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Cerrar foto">
        ✕
      </button>
      <div
        className="lightbox-stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {src && (
          <img
            src={src}
            alt=""
            draggable={false}
            className={`lightbox-img${animate ? ' animate' : ''}`}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
