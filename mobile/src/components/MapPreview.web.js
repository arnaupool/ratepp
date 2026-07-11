import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';

// react-native-maps has no web target; the web build (used for local dev
// preview and the e2e suite) falls back to a static card with a working
// "open navigation" link instead of an embedded map.
function openNavigation(lat, lng) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url).catch(() => {});
}

export default function MapPreview({ value, height = 140 }) {
  const { colors } = useTheme();
  if (!value) return null;
  const { lat, lng, label } = value;
  return (
    <View style={[styles.wrap, { height, backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={{ fontSize: 22 }}>📍</Text>
      <Text style={[type.detailFieldValue, styles.labelText, { color: colors.ink }]} numberOfLines={2}>
        {label || `${lat}, ${lng}`}
      </Text>
      {lat != null && lng != null && (
        <Pressable onPress={() => openNavigation(lat, lng)} hitSlop={6}>
          <Text style={[type.tagChip, { color: colors.accent }]}>Abrir en Maps</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 10,
  },
  labelText: { textAlign: 'center' },
});
