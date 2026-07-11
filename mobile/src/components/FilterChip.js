import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';

export default function FilterChip({ label, active, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[type.chip, { color: active ? colors.accentInk : colors.sub }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Fixed height + justifyContent:'center' instead of a padding-driven auto
  // height: on Android, custom-font text metrics (Poppins) can measure
  // differently than expected, so a container sized purely from
  // paddingVertical could still end up shorter/taller than its neighbors
  // depending on font-loading timing — a fixed height sidesteps that
  // entirely instead of chasing font-metric flags.
  chip: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
