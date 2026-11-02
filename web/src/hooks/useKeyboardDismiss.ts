import { useEffect } from 'react';

function isTextEntry(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  const type = (el as HTMLInputElement).type;
  return !['button', 'checkbox', 'radio', 'submit', 'range', 'file', 'color'].includes(type);
}

// Mobile keyboard behavior from the native app: tapping outside a text input
// closes the keyboard, and so does dragging the page. Blurring also fires the
// input's commit-on-blur handlers.
export function useKeyboardDismiss() {
  useEffect(() => {
    let startY: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      const active = document.activeElement;
      if (!isTextEntry(active)) return;
      const target = e.target as Element | null;
      if (target && (isTextEntry(target) || target.closest('label')?.contains(active))) return;
      active.blur();
    };
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const active = document.activeElement;
      if (startY === null || !isTextEntry(active)) return;
      const y = e.touches[0]?.clientY ?? startY;
      if (Math.abs(y - startY) > 12 && !(e.target instanceof Node && active.contains(e.target))) {
        active.blur();
        startY = null;
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
}
