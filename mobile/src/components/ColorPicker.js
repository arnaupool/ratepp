import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import { pastelize } from '../theme/colorUtils';

// Curated preset swatches spanning the hue wheel at the same soft-pastel
// lightness/saturation the built-in category tints use, so a manually
// picked color still looks like it belongs to the app.
const PRESETS = [
  '#f6c9c9', '#f6ddb8', '#f3ecb0', '#cfe8b8',
  '#b9e3d0', '#b9e0e8', '#bcd4f0', '#c9c3ee',
  '#e2c3ee', '#eec3dc',
];

export default function ColorPicker({ value, onChange, suggestedColor }) {
  const { colors } = useTheme();
  const suggested = suggestedColor ? pastelize(suggestedColor) : null;

  return (
    <View style={styles.row}>
      <Swatch
        selected={!value}
        onPress={() => onChange(null)}
        style={[styles.autoSwatch, { backgroundColor: colors.bg, borderColor: colors.line }]}
        accessibilityLabel="Color automático según categoría"
      >
        <Text style={{ fontSize: 9, color: colors.sub, fontWeight: '700' }}>AUTO</Text>
      </Swatch>

      {suggested && (
        <Swatch
          selected={value === suggested}
          onPress={() => onChange(suggested)}
          style={{ backgroundColor: suggested }}
          accessibilityLabel="Color sugerido de la portada"
        >
          <Text style={{ fontSize: 12 }}>📷</Text>
        </Swatch>
      )}

      {PRESETS.map((c) => (
        <Swatch
          key={c}
          selected={value === c}
          onPress={() => onChange(c)}
          style={{ backgroundColor: c }}
          accessibilityLabel={`Color ${c}`}
        />
      ))}
    </View>
  );
}

function Swatch({ selected, onPress, style, children, accessibilityLabel }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.swatch,
        style,
        selected && { borderWidth: 2.5, borderColor: colors.accent },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoSwatch: { borderWidth: 1, borderStyle: 'dashed' },
});
