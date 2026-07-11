import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import AnimatedSheet from './AnimatedSheet';

// Shown when leaving a screen's edit mode (back button or the iOS
// swipe-back gesture) while something might still be an uncommitted local
// edit (e.g. a title/field TextInput that hasn't blurred yet, so its
// onBlur-triggered save never fired). Three-way choice instead of
// ConfirmDialog's two, so it lives on its own rather than complicating that
// shared component's simpler API.
export default function UnsavedChangesDialog({ visible, onSave, onDiscard, onCancel }) {
  const { colors } = useTheme();
  return (
    <AnimatedSheet visible={visible} onClose={onCancel}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <Text style={[type.sheetTitle, { color: colors.ink }]}>¿Guardar los cambios?</Text>
        <Text style={[type.detailFieldValue, { color: colors.sub, marginTop: 6 }]}>
          Tienes cambios sin confirmar en esta puntuación.
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[type.loginBtn, { color: colors.sub }]}>Cancelar</Text>
          </Pressable>
          <Pressable style={[styles.discardBtn, { borderColor: '#c0392b' }]} onPress={onDiscard}>
            <Text style={[type.loginBtn, { color: '#c0392b' }]}>Descartar</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={onSave}>
            <Text style={[type.loginBtn, { color: colors.white }]}>Guardar</Text>
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  discardBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
