import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import AnimatedSheet from './AnimatedSheet';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

// value/onChange work with plain 'YYYY-MM-DD' strings (date-only, no time
// or timezone concerns since this is just "when did this happen"). `label`
// is shown as the picker sheet's title — needed when two DateFields sit
// side by side (e.g. the Home filters' Desde/Hasta row) so it's clear which
// one is currently open.
export default function DateField({ value, onChange, label }) {
  const { colors, dark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const dateObj = value ? new Date(`${value}T00:00:00`) : new Date();

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ ...webInputStyle, color: colors.ink }}
      />
    );
  }

  const onPickerChange = (event, selected) => {
    if (event.type === 'dismissed') return;
    if (selected) {
      const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
      onChange(iso);
    }
  };

  return (
    <View>
      <Pressable style={styles.trigger} onPress={() => setShowPicker(true)}>
        <Text style={[type.fieldInput, { color: value ? colors.ink : colors.sub }]}>
          {value ? formatDate(value) : 'Toca para elegir una fecha'}
        </Text>
      </Pressable>
      {/* Rendered in a full-width sheet rather than inline: the trigger above
          often sits in a narrow half-width column (e.g. Desde/Hasta side by
          side), which isn't wide enough for a calendar and previously made
          it overflow its box. The sheet title also makes it obvious which
          field ("Desde"/"Hasta") is being edited when there's more than one. */}
      <AnimatedSheet visible={showPicker} onClose={() => setShowPicker(false)}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[type.sheetTitle, { color: colors.ink }]}>
            {label ? `Elegir fecha — ${label}` : 'Elegir fecha'}
          </Text>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
            onChange={onPickerChange}
            style={styles.picker}
            themeVariant={dark ? 'dark' : 'light'}
            accentColor={colors.accent}
          />
          <Pressable style={[styles.doneBtn, { backgroundColor: colors.accent }]} onPress={() => setShowPicker(false)}>
            <Text style={[type.loginBtn, { color: colors.white }]}>Listo</Text>
          </Pressable>
        </View>
      </AnimatedSheet>
    </View>
  );
}

const webInputStyle = {
  fontFamily: 'Poppins_600SemiBold',
  fontSize: 14.5,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  padding: 0,
  width: '100%',
};

const styles = StyleSheet.create({
  trigger: { paddingVertical: 2 },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 10,
  },
  picker: { alignSelf: 'stretch', width: '100%' },
  doneBtn: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
