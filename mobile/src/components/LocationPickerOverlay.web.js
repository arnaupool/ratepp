import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import AnimatedSheet from './AnimatedSheet';

// react-native-maps and expo-location's geocoding calls aren't available on
// web; this fallback (used by the local web preview / e2e tests) just
// captures a free-text label plus optionally the browser's own geolocation.
export default function LocationPickerOverlay({ visible, initialValue, onClose, onConfirm }) {
  const { colors } = useTheme();
  const [label, setLabel] = useState(initialValue?.label || '');
  const [coords, setCoords] = useState(
    initialValue?.lat != null ? { lat: initialValue.lat, lng: initialValue.lng } : null
  );

  const useCurrentLocation = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      // geolocation unavailable/denied — the label is still usable on its own
    }
  };

  return (
    <AnimatedSheet visible={visible} onClose={onClose}>
      <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
        <View style={styles.sheetGrab} />
        <Text style={[type.sheetTitle, { color: colors.ink }]}>Elegir ubicación</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.line, color: colors.ink }]}
          placeholder="Ej. Calle Mayor 12, Madrid"
          placeholderTextColor={colors.sub}
          value={label}
          onChangeText={setLabel}
        />
        <Pressable style={styles.currentBtn} onPress={useCurrentLocation}>
          <Text style={[type.chip, { color: colors.accent }]}>
            📍 {coords ? 'Ubicación actual capturada' : 'Usar mi ubicación actual'}
          </Text>
        </Pressable>
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={[type.loginBtn, { color: colors.sub }]}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, { backgroundColor: colors.accent }, !label.trim() && styles.confirmBtnDisabled]}
            disabled={!label.trim()}
            onPress={() => onConfirm({ label: label.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null })}
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
    gap: 12,
  },
  sheetGrab: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center' },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  currentBtn: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { flex: 2, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
});
