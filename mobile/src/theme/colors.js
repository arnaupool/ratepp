import { lightColors, categoryTint as categoryTintFor, scoreColor, photoStripeColors as photoStripeColorsFor, hashSeed } from './palettes';

// Backward-compat shim for any code that hasn't been migrated to
// useTheme() yet — always resolves to the light palette. Prefer
// `useTheme().colors` in components so theme changes apply at runtime.
export const colors = lightColors;

export function categoryTint(category) {
  return categoryTintFor(category, false);
}

export function photoStripeColors(seed) {
  return photoStripeColorsFor(seed, false);
}

export { scoreColor, hashSeed };
