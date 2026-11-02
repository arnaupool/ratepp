// Color helpers ported from mobile/src/theme (palettes.js, colorUtils.js).
// oklch() is used directly; browsers support it, unlike React Native.

export function scoreColor(n: number | null | undefined) {
  if (!n) return 'oklch(0.78 0.01 70)';
  const t = (n - 1) / 9;
  const hue = 18 + t * 125;
  return `oklch(0.52 0.15 ${hue})`;
}

const CATEGORY_TINTS: Record<string, string> = {
  Restaurantes: 'var(--tint-restaurantes)',
  Películas: 'var(--tint-peliculas)',
  Recuerdos: 'var(--tint-recuerdos)',
};

/** Card tint for a score with no custom color, from its first category. */
export function categoryTint(category: string | undefined) {
  return (category && CATEGORY_TINTS[category]) || 'var(--tint-default)';
}

export function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash % 97;
}

/** Diagonal-stripe placeholder for a score without photos. */
export function photoStripe(seed: number, dark: boolean, stripe = 16) {
  const hue = 30 + ((seed * 47) % 330);
  const [a, b] = dark ? [`oklch(0.32 0.06 ${hue})`, `oklch(0.26 0.04 ${hue})`] : [`oklch(0.88 0.05 ${hue})`, `oklch(0.92 0.03 ${hue})`];
  return `repeating-linear-gradient(115deg, ${a} 0 ${stripe}px, ${b} ${stripe}px ${stripe * 2}px)`;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHsl({ r, g, b }: Rgb) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }: { h: number; s: number; l: number }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return `#${rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Softens a photo's average color into the app's pastel range. */
export function pastelize(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return hslToHex({ h: hsl.h, s: Math.min(Math.max(hsl.s, 0.25), 0.55), l: 0.88 });
}

/**
 * Text colors for content sitting directly on a custom card color, which can
 * be light or dark regardless of the theme (WCAG relative luminance).
 */
export function contrastTextColors(hex: string | null | undefined) {
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return null;
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
  return luminance > 0.5 ? { ink: '#241f1a', sub: 'rgba(36,31,26,.68)' } : { ink: '#f7f4f0', sub: 'rgba(247,244,240,.75)' };
}
