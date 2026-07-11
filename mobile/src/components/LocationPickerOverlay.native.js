import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import AnimatedSheet from './AnimatedSheet';

const DEFAULT_REGION = { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.05, longitudeDelta: 0.05 };

function buildLabel(geocoded) {
  if (!geocoded) return null;
  const parts = [geocoded.street, geocoded.name, geocoded.city || geocoded.subregion, geocoded.region].filter(Boolean);
  return [...new Set(parts)].join(', ') || null;
}

export default function LocationPickerOverlay({ visible, initialValue, onClose, onConfirm }) {
  const mapRef = useRef(null);
  const [marker, setMarker] = useState(
    initialValue?.lat != null ? { latitude: initialValue.lat, longitude: initialValue.lng } : null
  );
  const [label, setLabel] = useState(initialValue?.label || '');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const applyPoint = async (coords, fallbackLabel) => {
    setMarker(coords);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 300);
    if (fallbackLabel) {
      setLabel(fallbackLabel);
      return;
    }
    try {
      const [geocoded] = await Location.reverseGeocodeAsync(coords);
      setLabel(buildLabel(geocoded) || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
    } catch {
      setLabel(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
    }
  };

  const onMapPress = (e) => applyPoint(e.nativeEvent.coordinate);

  const useCurrentLocation = async () => {
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error();
      const pos = await Location.getCurrentPositionAsync({});
      await applyPoint({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      // permission denied or unavailable — silently ignore, user can search/tap instead
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async () => {
    if (!search.trim()) return;
    setBusy(true);
    try {
      const results = await Location.geocodeAsync(search.trim());
      if (results[0]) {
        await applyPoint({ latitude: results[0].latitude, longitude: results[0].longitude }, search.trim());
      }
    } catch {
      // no match — keep current marker
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatedSheet visible={visible} onClose={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetGrab} />
        <Text style={[type.sheetTitle, { color: colors.ink }]}>Elegir ubicación</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar dirección..."
            placeholderTextColor={colors.sub}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          <Pressable style={styles.searchBtn} onPress={runSearch}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
          </Pressable>
        </View>

        <Pressable style={styles.currentBtn} onPress={useCurrentLocation}>
          <Text style={[type.chip, { color: colors.accent }]}>📍 Usar mi ubicación actual</Text>
        </Pressable>

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={marker ? { ...marker, latitudeDelta: 0.01, longitudeDelta: 0.01 } : DEFAULT_REGION}
            onPress={onMapPress}
          >
            {marker && <Marker coordinate={marker} />}
          </MapView>
          {busy && (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}
        </View>

        {!!label && (
          <Text style={[type.detailFieldValue, { color: colors.sub }]} numberOfLines={2}>{label}</Text>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={[type.loginBtn, { color: colors.sub }]}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, !marker && styles.confirmBtnDisabled]}
            disabled={!marker}
            onPress={() => onConfirm({ label, lat: marker.latitude, lng: marker.longitude })}
          >
            <Text style={[type.loginBtn, { color: colors.white }]}>Confirmar ubicación</Text>
          </Pressable>
        </View>
      </Pressable>
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: colors.surface,
    gap: 12,
  },
  sheetGrab: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center' },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  currentBtn: { alignSelf: 'flex-start' },
  mapWrap: { width: '100%', height: 220, borderRadius: 14, overflow: 'hidden' },
  busyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { flex: 2, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  confirmBtnDisabled: { opacity: 0.5 },
});
