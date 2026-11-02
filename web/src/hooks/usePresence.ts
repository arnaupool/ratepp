import { useEffect, useState } from 'react';

// Keeps an overlay mounted through its exit transition: `mounted` controls
// rendering, `shown` toggles the CSS class that drives the enter/exit
// transition. Entering waits one frame so the browser paints the start state
// first; otherwise the transition doesn't run.
export function usePresence(visible: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [visible, exitMs]);

  return { mounted, shown };
}
