import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

export default function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.on : styles.off]}
    >
      <Text style={[type.chip, { color: active ? colors.accentInk : colors.sub }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  off: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  on: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
