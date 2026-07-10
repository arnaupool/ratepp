import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { photoStripeColors } from '../theme/colors';

// Approximates the design's `repeating-linear-gradient(115deg, c1 0 Npx, c2 Npx 2Npx)`
// diagonal-stripe placeholder (used before a real photo is uploaded) with a
// banded LinearGradient — RN has no repeating-gradient primitive.
export default function PhotoStripe({ seed, style, bands = 6 }) {
  const [c1, c2] = photoStripeColors(seed);
  const colors = [];
  const locations = [];
  for (let i = 0; i < bands; i++) {
    const from = i / bands;
    const to = (i + 1) / bands;
    colors.push(i % 2 === 0 ? c1 : c2, i % 2 === 0 ? c1 : c2);
    locations.push(from, to);
  }
  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={{ x: 0, y: 0.1 }}
      end={{ x: 1, y: 0.9 }}
      style={style}
    />
  );
}
