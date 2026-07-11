import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import AnimatedSheet from './AnimatedSheet';

// Generic destructive-action confirmation, built on the same AnimatedSheet
// chrome as the rest of the app's overlays — react-native-web's Alert
// support is unreliable, so a custom dialog behaves consistently on both
// web preview and native.
export default function ConfirmDialog({ visible, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  const { colors } = useTheme();
  return (
    <AnimatedSheet visible={visible} onClose={onCancel}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <Text style={[type.sheetTitle, { color: colors.ink }]}>{title}</Text>
        {!!message && <Text style={[type.detailFieldValue, { color: colors.sub, marginTop: 6 }]}>{message}</Text>}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[type.loginBtn, { color: colors.sub }]}>Cancelar</Text>
          </Pressable>
          <Pressable style={[styles.confirmBtn, { backgroundColor: '#c0392b' }]} onPress={onConfirm}>
            <Text style={[type.loginBtn, { color: colors.white }]}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
