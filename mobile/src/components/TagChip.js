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
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
});
