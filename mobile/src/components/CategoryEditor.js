import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';
import { animateNext } from '../utils/animate';

// Shared multi-category editor for Create and Detail's edit mode. Selected
// categories are always visible as chips; the rest of the suggestion list
// is collapsed behind the small chevron next to the input (not a "Ver
// todas" text link) until tapped.
export default function CategoryEditor({ categories, suggestions, onToggle, onAddCustom }) {
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);

  const submitDraft = () => {
    const c = draft.trim();
    if (!c) return;
    onAddCustom(c);
    setDraft('');
  };

  const toggleExpanded = () => {
    animateNext();
    setExpanded((v) => !v);
  };

  const visibleChips = expanded ? suggestions : suggestions.filter((c) => categories.includes(c));

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Escribe y pulsa enter para añadir..."
          placeholderTextColor={colors.sub}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submitDraft}
          returnKeyType="done"
        />
        <Pressable
          style={styles.chevronBtn}
          onPress={toggleExpanded}
          accessibilityLabel={expanded ? 'Ocultar categorías' : 'Ver todas las categorías'}
        >
          <Text style={styles.chevronText}>{expanded ? '▴' : '▾'}</Text>
        </Pressable>
      </View>
      {visibleChips.length > 0 && (
        <View style={styles.chips}>
          {visibleChips.map((c) => {
            const on = categories.includes(c);
            return (
              <Pressable key={c} onPress={() => onToggle(c)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[type.chip, { color: on ? colors.accentInk : colors.sub }]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  chevronBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chevronText: { fontSize: 14, color: colors.sub },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
