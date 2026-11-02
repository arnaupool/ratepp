import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../hooks/usePresence';
import { useScrollLock } from '../hooks/useScrollLock';
import { useVisualViewport } from '../hooks/useVisualViewport';
import './Sheet.css';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label?: string;
}

// Bottom sheet shared by every overlay (filters, date picker, cover search,
// location picker, confirmations): scrim fades in over 180ms while the panel
// slides up over 240ms (ease-out cubic); closing is 150/180ms ease-in.
// Rendered in a portal so it always covers the whole screen, and sized to the
// visual viewport so the iOS keyboard shrinks it instead of covering it.
export default function Sheet({ visible, onClose, children, className = '', label }: SheetProps) {
  const { mounted, shown } = usePresence(visible, 180);
  const vv = useVisualViewport();
  useScrollLock(mounted);

  useEffect(() => {
    // Opening a sheet closes the keyboard.
    if (visible && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className={`sheet-root${shown ? ' shown' : ''}`} style={{ top: vv.top, height: vv.height }}>
      <div className="sheet-scrim" onClick={onClose} />
      <div className={`sheet-panel ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body
  );
}
