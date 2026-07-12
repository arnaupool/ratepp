// Small hex<->HSL round trip so an auto-extracted photo color (which can be
// any raw hue/saturation/lightness) can be "softened" into the same pastel
// range the app's category tints already use, instead of applying it to a
// card background at full strength (which could easily clash with dark ink
// text on top of it).
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to255 = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

// Keeps the hue, clamps lightness/saturation into the same soft-pastel band
// the built-in category tints use (see theme/palettes.js's oklch calls).
export function pastelize(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return hslToHex({ h: hsl.h, s: Math.min(Math.max(hsl.s, 0.25), 0.55), l: 0.88 });
}

// A user-picked card color can be light or dark independent of the current
// light/dark theme (e.g. a pastel picked in light mode, then viewed in dark
// mode where "ink" text turns white) — so text sitting directly on that
// color needs its own contrast decision instead of the theme's fixed ink.
// Standard WCAG relative luminance picks readable near-black/near-white.
export function contrastTextColors(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
  return luminance > 0.5
    ? { ink: '#241f1a', sub: 'rgba(36,31,26,0.68)' }
    : { ink: '#f7f4f0', sub: 'rgba(247,244,240,0.75)' };
}
