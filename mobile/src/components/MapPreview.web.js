import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

// react-native-maps has no web target; the web build (used for local dev
// preview and the e2e suite) falls back to a static card with a working
// "open navigation" link instead of an embedded map.
function openNavigation(lat, lng) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url).catch(() => {});
}

export default function MapPreview({ value, height = 140 }) {
  if (!value) return null;
  const { lat, lng, label } = value;
  return (
    <Pressable
      onPress={() => lat != null && lng != null && openNavigation(lat, lng)}
      style={[styles.wrap, { height }]}
    >
      <Text style={{ fontSize: 22 }}>📍</Text>
      <Text style={[type.detailFieldValue, styles.labelText]} numberOfLines={2}>
        {label || `${lat}, ${lng}`}
      </Text>
      {lat != null && lng != null && (
        <Text style={[type.tagChip, { color: colors.accent }]}>Abrir en Maps</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 10,
  },
  labelText: { color: colors.ink, textAlign: 'center' },
});
