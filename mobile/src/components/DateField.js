import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

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
// or timezone concerns since this is just "when did this happen").
export default function DateField({ value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const dateObj = value ? new Date(`${value}T00:00:00`) : new Date();

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={webInputStyle}
      />
    );
  }

  const onPickerChange = (event, selected) => {
    // Android's native dialog closes itself on both 'set' and 'dismissed';
    // iOS's inline calendar stays open until the "Listo" button below closes it.
    if (Platform.OS === 'android') setShowPicker(false);
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
      {showPicker && (
        <View>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onPickerChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.doneBtn} onPress={() => setShowPicker(false)}>
              <Text style={[type.chip, { color: colors.white }]}>Listo</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const webInputStyle = {
  fontFamily: 'Nunito_600SemiBold',
  fontSize: 14.5,
  color: colors.ink,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  padding: 0,
  width: '100%',
};

const styles = StyleSheet.create({
  trigger: { paddingVertical: 2 },
  doneBtn: {
    alignSelf: 'center',
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: colors.accent,
  },
});
