import { oklchToHex } from './oklch';

// Design tokens ported 1:1 from the "vibrante colorida" (1b) theme in
// Puntuaciones App.dc.html — `.theme { --bg:oklch(...); ... }`.
export const colors = {
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

// `.card.tag-<Categoría>` background tints — used for the three example
// categories from the design brief. Any other user-typed category falls
// back to `categoryFallback`.
const CATEGORY_COLORS = {
  Restaurantes: oklchToHex(0.92, 0.045, 40),
  'Películas': oklchToHex(0.92, 0.035, 265),
  Recuerdos: oklchToHex(0.92, 0.045, 160),
};
const categoryFallback = oklchToHex(0.92, 0.02, 50);

export function categoryTint(category) {
  if (!category) return categoryFallback;
  return CATEGORY_COLORS[category] || categoryFallback;
}

// Ported from `scoreColor(n)` in the design script: red at 1, green at 10.
export function scoreColor(n) {
  if (!n) return oklchToHex(0.78, 0.01, 70);
  const t = (n - 1) / 9;
  const hue = 18 + t * 125;
  return oklchToHex(0.52, 0.15, hue);
}

// Ported from `photoStripe(seed)` — a deterministic warm diagonal-stripe
// placeholder used when a card/field has no real photo yet.
export function photoStripeColors(seed) {
  const hue = 30 + ((seed * 47) % 330);
  return [oklchToHex(0.88, 0.05, hue), oklchToHex(0.92, 0.03, hue)];
}

export function hashSeed(value) {
  const str = String(value ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 97;
}
