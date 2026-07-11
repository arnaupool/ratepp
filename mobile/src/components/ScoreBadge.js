import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { scoreColor } from '../theme/colors';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeContext';

export default function ScoreBadge({ value, size = 30, onPress, style, borderColor }) {
  const { colors } = useTheme();
  const bg = scoreColor(value);
  const textStyle = size >= 38 ? type.scoreBadgeLg : size <= 26 ? type.scoreBadgeMini : type.scoreBadge;
  const Comp = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: borderColor ? 2 : 0,
          borderColor: borderColor || 'transparent',
        },
        style,
      ]}
    >
      <Text style={[textStyle, { color: colors.white }]}>{value}</Text>
    </Comp>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
