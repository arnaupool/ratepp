import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../theme/typography';

// Recreations of the pure-CSS `.ficon.t-*` glyphs from the design (border
// tricks / pseudo-elements) as small View compositions, since RN has no
// CSS pseudo-elements or repeating-linear-gradient.
export default function FieldIcon({ type, size = 18, color = '#fff' }) {
  const stroke = size >= 16 ? 2 : 1.5;

  switch (type) {
    case 'text':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', gap: size * 0.16 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ height: size * 0.14, width: size * 0.85, borderRadius: 1, backgroundColor: color }} />
          ))}
        </View>
      );
    case 'number':
      return (
        <Text style={{ fontFamily: fonts.extrabold, fontSize: size * 0.85, color, lineHeight: size }}>#</Text>
      );
    case 'date':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.82, height: size * 0.82, borderWidth: stroke, borderColor: color, borderRadius: 3 }} />
          <View style={{ position: 'absolute', top: -1, right: -1, width: size * 0.3, height: size * 0.3, borderRadius: 999, backgroundColor: color }} />
        </View>
      );
    case 'location':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.82, height: size * 0.82, borderWidth: stroke, borderColor: color, borderRadius: 999 }} />
          <View style={{ position: 'absolute', width: size * 0.28, height: size * 0.28, borderRadius: 999, backgroundColor: color }} />
        </View>
      );
    case 'photo':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.88, height: size * 0.7, borderWidth: stroke, borderColor: color, borderRadius: 3 }} />
          <View style={{ position: 'absolute', bottom: -1, left: -1, width: size * 0.32, height: size * 0.32, borderRadius: 999, backgroundColor: color }} />
        </View>
      );
    case 'gallery':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, width: size * 0.68, height: size * 0.68, borderWidth: stroke, borderColor: color, borderRadius: 3 }} />
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: size * 0.68, height: size * 0.68, borderWidth: stroke, borderColor: color, borderRadius: 3 }} />
        </View>
      );
    case 'tag':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.58, height: size * 0.58, borderWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />
        </View>
      );
    case 'list':
      return (
        <Text style={{ fontFamily: fonts.extrabold, fontSize: size * 0.8, color, lineHeight: size }}>☰</Text>
      );
    default:
      return <View style={{ width: size, height: size }} />;
  }
}
