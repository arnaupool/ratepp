import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { tagsApi } from '../api/tags';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import { animateNext } from '../utils/animate';

// Multi-select tag field: shows the chosen tags as removable chips, a text
// input to type a brand-new one (Enter to add), and a collapsed-by-default
// dropdown of previously-used tags (across all scores) to reuse instead of
// retyping.
export default function TagAutocomplete({ value, onChange }) {
  const { colors } = useTheme();
  const tags = Array.isArray(value) ? value : [];
  const [allTags, setAllTags] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    tagsApi.list().then(({ tags: fetched }) => setAllTags(fetched)).catch(() => {});
  }, []);

  const addTag = (t) => {
    const clean = t.trim();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
  };

  const removeTag = (t) => {
    animateNext();
    onChange(tags.filter((x) => x !== t));
  };

  const submitDraft = () => {
    addTag(draft);
    setDraft('');
  };

  const toggleExpanded = () => {
    animateNext();
    setExpanded((v) => !v);
  };

  const availableSuggestions = allTags.filter((t) => !tags.includes(t));

  return (
    <View style={{ gap: 8 }}>
      {tags.length > 0 && (
        <View style={styles.chips}>
          {tags.map((t) => (
            <View key={t} style={[styles.selectedChip, { backgroundColor: colors.accent }]}>
              <Text style={[type.chip, { color: colors.accentInk }]}>{t}</Text>
              <Pressable onPress={() => removeTag(t)} hitSlop={6} accessibilityLabel={`Quitar etiqueta ${t}`}>
                <Text style={[styles.selectedChipRemove, { color: colors.white }]}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <TextInput
        style={[styles.input, { color: colors.ink }]}
        placeholder="Escribe una etiqueta y pulsa enter..."
        placeholderTextColor={colors.sub}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submitDraft}
        returnKeyType="done"
      />

      {availableSuggestions.length > 0 && (
        <Pressable onPress={toggleExpanded} style={styles.toggleRow}>
          <Text style={[type.listAdd, { color: colors.accent }]}>
            {expanded ? 'Ocultar etiquetas usadas' : 'Ver etiquetas usadas anteriormente'} {expanded ? '▴' : '▾'}
          </Text>
        </Pressable>
      )}

      {expanded && (
        <View style={styles.chips}>
          {availableSuggestions.map((t) => (
            <Pressable key={t} style={[styles.suggestionChip, { backgroundColor: colors.bg, borderColor: colors.line }]} onPress={() => addTag(t)}>
              <Text style={[type.chip, { color: colors.sub }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectedChipRemove: { fontSize: 9, fontWeight: '700' },
  input: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
    padding: 0,
  },
  toggleRow: { alignSelf: 'flex-start' },
  suggestionChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
});
