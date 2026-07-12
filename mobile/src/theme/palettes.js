import { oklchToHex } from './oklch';

// Light palette: tokens ported 1:1 from the "vibrante colorida" (1b) theme
// in Puntuaciones App.dc.html — `.theme { --bg:oklch(...); ... }`.
export const lightColors = {
  bg: oklchToHex(0.97, 0.014, 75),
  surface: oklchToHex(0.99, 0.006, 65),
  ink: oklchToHex(0.22, 0.02, 40),
  sub: oklchToHex(0.48, 0.02, 40),
  accent: oklchToHex(0.62, 0.17, 42),
  accent2: oklchToHex(0.66, 0.15, 85),
  accentInk: '#ffffff',
  line: oklchToHex(0.88, 0.02, 50),
  fabShadow: oklchToHex(0.62, 0.17, 42, 0.55),
  extraBadge: 'rgba(0,0,0,0.55)',
  white: '#ffffff',
};

// Dark palette: same hues (so the app still reads as "the same app"), with
// lightness inverted and the accent bumped up slightly for contrast against
// a dark background.
export const darkColors = {
  bg: oklchToHex(0.17, 0.014, 75),
  surface: oklchToHex(0.23, 0.014, 70),
  ink: oklchToHex(0.94, 0.01, 60),
  // Bumped from 0.68 — that read as too washed-out/low-contrast on a real
  // OLED screen despite passing WCAG contrast math on paper.
  sub: oklchToHex(0.80, 0.015, 60),
  accent: oklchToHex(0.68, 0.17, 42),
  accent2: oklchToHex(0.72, 0.14, 85),
  accentInk: '#ffffff',
  line: oklchToHex(0.34, 0.02, 60),
  fabShadow: oklchToHex(0.68, 0.17, 42, 0.55),
  extraBadge: 'rgba(0,0,0,0.55)',
  white: '#ffffff',
};

const CATEGORY_COLORS_LIGHT = {
  Restaurantes: oklchToHex(0.92, 0.045, 40),
  'Películas': oklchToHex(0.92, 0.035, 265),
  Recuerdos: oklchToHex(0.92, 0.045, 160),
};
const CATEGORY_COLORS_DARK = {
  Restaurantes: oklchToHex(0.3, 0.045, 40),
  'Películas': oklchToHex(0.3, 0.035, 265),
  Recuerdos: oklchToHex(0.3, 0.045, 160),
};
const categoryFallbackLight = oklchToHex(0.92, 0.02, 50);
const categoryFallbackDark = oklchToHex(0.3, 0.02, 50);

export function categoryTint(category, dark) {
  const map = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  const fallback = dark ? categoryFallbackDark : categoryFallbackLight;
  if (!category) return fallback;
  return map[category] || fallback;
}

// Ported from `scoreColor(n)` in the design script: red at 1, green at 10.
// A mid-lightness scale reads fine as a badge fill against either theme's
// background, so this doesn't need a dark variant.
export function scoreColor(n) {
  if (!n) return oklchToHex(0.78, 0.01, 70);
  const t = (n - 1) / 9;
  const hue = 18 + t * 125;
  return oklchToHex(0.52, 0.15, hue);
}

// Ported from `photoStripe(seed)` — a deterministic warm diagonal-stripe
// placeholder used when a card/field has no real photo yet.
export function photoStripeColors(seed, dark) {
  const hue = 30 + ((seed * 47) % 330);
  return dark
    ? [oklchToHex(0.32, 0.06, hue), oklchToHex(0.26, 0.04, hue)]
    : [oklchToHex(0.88, 0.05, hue), oklchToHex(0.92, 0.03, hue)];
}

export function hashSeed(value) {
  const str = String(value ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 97;
}
