import { useEffect, useState } from 'react';

// The part of the screen actually visible. On iOS Safari the keyboard
// shrinks the visual viewport but not the layout viewport, so anything
// pinned to the bottom with position:fixed ends up behind the keyboard
// unless it follows these numbers.
export function useVisualViewport() {
  const read = () => {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, height: vv.height } : { top: 0, height: window.innerHeight };
  };
  const [box, setBox] = useState(read);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setBox(read());
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return box;
}
