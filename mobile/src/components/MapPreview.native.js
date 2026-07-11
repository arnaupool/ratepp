import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

function openNavigation(lat, lng, label) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${label ? `&destination_place_id=&query=${encodeURIComponent(label)}` : ''}`;
  Linking.openURL(url).catch(() => {});
}

export default function MapPreview({ value, height = 140 }) {
  if (!value || value.lat == null || value.lng == null) return null;
  const { lat, lng, label } = value;
  return (
    <Pressable onPress={() => openNavigation(lat, lng, label)} style={[styles.wrap, { height }]}>
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
        <View style={styles.labelWrap}>
          <Text style={[type.detailFieldValue, styles.labelText]} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
  labelWrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  labelText: { color: colors.ink },
});
