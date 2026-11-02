import { useEffect } from 'react';

let locks = 0;

// Stops the page behind an open sheet/dialog from scrolling. Counted, so
// nested sheets (a date picker inside the filters sheet) release correctly.
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks++;
    document.documentElement.classList.add('scroll-locked');
    return () => {
      locks--;
      if (locks === 0) document.documentElement.classList.remove('scroll-locked');
    };
  }, [active]);
}
