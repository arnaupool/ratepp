import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

export default function TagChip({ label, style }) {
  if (!label) return null;
  return (
    <View style={[styles.chip, style]}>
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.line,
  },
});
