import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NUMBERS } from '../constants/fieldDefs';
import { colors, scoreColor } from '../theme/colors';
import { type } from '../theme/typography';

// Single-row 1-10 selector — kept as one non-wrapping row per the design
// feedback ("me da un poco de TOC que esté el 9 y el 10 separados").
export default function NumberPillRow({ value, onSelect }) {
  return (
    <View style={styles.row}>
      {NUMBERS.map((n) => {
        const on = value === n;
        return (
          <Pressable
            key={n}
            onPress={() => onSelect(n)}
            style={[
              styles.pill,
              on
                ? { backgroundColor: scoreColor(n), borderColor: scoreColor(n) }
                : { borderColor: colors.line },
            ]}
          >
            <Text style={[type.numPill, { color: on ? colors.white : colors.ink }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5 },
  pill: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
