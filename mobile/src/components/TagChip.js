import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';

export default function TagChip({ label, style }) {
  const { colors } = useTheme();
  if (!label) return null;
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>
      <Text style={[type.tagChip, { color: colors.sub }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed height + centered content instead of a padding-driven auto height,
  // same reasoning as FilterChip: custom-font (Poppins) text metrics on
  // Android can measure oddly and squish a padding-sized container.
  chip: {
    alignSelf: 'flex-start',
    height: 22,
    borderRadius: 999,
    paddingHorizontal: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
