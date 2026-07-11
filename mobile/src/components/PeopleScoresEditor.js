import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import ScoreBadge from './ScoreBadge';
import NumberPillRow from './NumberPillRow';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';

// Shared "multi-person scoring" widget used on both the Create screen and
// the Detail screen — a row of people (owner + optional extra raters),
// each with a tappable score badge; tapping opens a shared inline
// 1-10 row to edit whichever person is currently selected.
export default function PeopleScoresEditor({
  people,
  editingId,
  onStartEdit,
  onSelectNumber,
  onRename,
  onRenameCommit,
  onRemove,
  onAdd,
}) {
  const { colors } = useTheme();
  const editingPerson = people.find((p) => p.id === editingId);

  return (
    <View>
      <View style={styles.row}>
        {people.map((p) => (
          <View key={p.id} style={styles.person}>
            {p.isOwner ? (
              <Text style={[type.personName, { color: colors.sub }]}>{p.name}</Text>
            ) : (
              <View style={styles.nameRow}>
                <TextInput
                  value={p.name}
                  onChangeText={(v) => onRename(p.id, v)}
                  onBlur={() => onRenameCommit && onRenameCommit(p.id)}
                  style={[type.personName, styles.nameInput, { color: colors.sub }]}
                />
                <Pressable onPress={() => onRemove(p.id)} style={[styles.removeBtn, { backgroundColor: 'rgba(128,128,128,0.15)' }]} hitSlop={6} accessibilityLabel="Quitar persona">
                  <Text style={[styles.removeBtnText, { color: colors.sub }]}>✕</Text>
                </Pressable>
              </View>
            )}
            <ScoreBadge value={p.value} size={44} onPress={() => onStartEdit(p.id)} />
          </View>
        ))}
        <View style={styles.person}>
          <Pressable style={[styles.addPerson, { borderColor: colors.line }]} onPress={onAdd} accessibilityLabel="Añadir persona">
            <Text style={[styles.addPersonPlus, { color: colors.sub }]}>+</Text>
          </Pressable>
          <Text style={[type.personName, { color: colors.sub }]}>Añadir</Text>
        </View>
      </View>

      {editingPerson && (
        <View style={styles.editContext}>
          <Text style={[type.editContext, { color: colors.sub }]}>
            Editando puntuación de {editingPerson.name}
          </Text>
          <View style={{ marginTop: 10 }}>
            <NumberPillRow value={editingPerson.value} onSelect={(n) => onSelectNumber(editingPerson.id, n)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
  person: { alignItems: 'center', gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  nameInput: {
    textAlign: 'center',
    width: 44,
    padding: 0,
  },
  removeBtn: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 8, fontWeight: '700', lineHeight: 9 },
  addPerson: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPersonPlus: { fontSize: 18, fontWeight: '800' },
  editContext: { marginTop: 12 },
});
