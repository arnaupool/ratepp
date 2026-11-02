import { useEffect } from 'react';

// Paints the whole page (including iOS overscroll areas) with a score's
// custom card color while its screen is open.
export function usePageBackground(color: string | null | undefined) {
  useEffect(() => {
    if (!color) return;
    const root = document.documentElement;
    root.style.setProperty('--page-bg', color);
    root.classList.add('custom-page-bg');
    return () => {
      root.classList.remove('custom-page-bg');
      root.style.removeProperty('--page-bg');
    };
  }, [color]);
}
