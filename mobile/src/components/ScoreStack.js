import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scoreColor, colors } from '../theme/colors';
import { type } from '../theme/typography';

const MINI = 24;

// Home-card score display: a single badge when there's one rating, or the
// first two stacked mini-badges + a "+N" bubble when there are more —
// ported from the design's `.score-stack` / `.score-badge.mini.extra`.
export default function ScoreStack({ ratings }) {
  if (!ratings || ratings.length === 0) return null;
  if (ratings.length === 1) {
    const r = ratings[0];
    return (
      <View style={[styles.mini, { width: 30, height: 30, borderRadius: 15, backgroundColor: scoreColor(r.value) }]}>
        <Text style={[{ fontFamily: 'Nunito_900Black', fontSize: 13 }, styles.text]}>{r.value}</Text>
      </View>
    );
  }
  const visible = ratings.slice(0, 2);
  const extra = ratings.length - 2;
  return (
    <View style={styles.stack}>
      {visible.map((r, i) => (
        <View
          key={r.id || i}
          style={[
            styles.mini,
            { backgroundColor: scoreColor(r.value), marginLeft: i === 0 ? 0 : -9 },
          ]}
        >
          <Text style={[type.scoreBadgeMini, styles.text]}>{r.value}</Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={[styles.mini, { backgroundColor: colors.extraBadge, marginLeft: -9 }]}>
          <Text style={[type.scoreBadgeMini, styles.text]}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', flexShrink: 0 },
  mini: {
    width: MINI,
    height: MINI,
    borderRadius: MINI / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fffbf8',
  },
  text: { color: colors.white },
});
