import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { tagsApi } from '../api/tags';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

// Lets a 'tag' field either reuse an existing tag (typed on any other
// score) or freely type a new one — the field's value is just the string.
export default function TagAutocomplete({ value, onChange, placeholder }) {
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    tagsApi.list().then(({ tags }) => setAllTags(tags)).catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    const pool = q ? allTags.filter((t) => t.toLowerCase().includes(q) && t.toLowerCase() !== q) : allTags;
    return pool.slice(0, 8);
  }, [allTags, value]);

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        style={styles.input}
        placeholder={placeholder || 'Escribe o elige una etiqueta...'}
        placeholderTextColor={colors.sub}
        value={value}
        onChangeText={onChange}
      />
      {suggestions.length > 0 && (
        <View style={styles.chips}>
          {suggestions.map((t) => (
            <Pressable key={t} style={styles.chip} onPress={() => onChange(t)}>
              <Text style={[type.chip, { color: colors.sub }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14.5,
    color: colors.ink,
    padding: 0,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
