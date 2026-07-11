import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';

function openNavigation(lat, lng, label) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${label ? `&destination_place_id=&query=${encodeURIComponent(label)}` : ''}`;
  Linking.openURL(url).catch(() => {});
}

// The map itself is purely informational (no press handler on the map
// area) — a tap target that covers the whole card was firing on ordinary
// scroll gestures, launching the navigation app by accident. Only the
// small explicit "navigate" button opens it.
export default function MapPreview({ value, height = 140 }) {
  const { colors } = useTheme();
  if (!value || value.lat == null || value.lng == null) return null;
  const { lat, lng, label } = value;
  return (
    <View style={[styles.wrap, { height, backgroundColor: colors.surface }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} />
      </MapView>
      {!!label && (
        <View style={[styles.labelWrap, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
          <Text style={[type.detailFieldValue, styles.labelText, { color: colors.ink }]} numberOfLines={1}>{label}</Text>
        </View>
      )}
      <Pressable
        style={[styles.navBtn, { backgroundColor: colors.accent }]}
        onPress={() => openNavigation(lat, lng, label)}
        accessibilityLabel="Abrir navegación"
        hitSlop={4}
      >
        <Text style={[styles.navBtnText, { color: colors.white }]}>↗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  labelWrap: {
    position: 'absolute',
    left: 8,
    right: 44,
    bottom: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  labelText: {},
  navBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { fontSize: 15, fontWeight: '800' },
});
