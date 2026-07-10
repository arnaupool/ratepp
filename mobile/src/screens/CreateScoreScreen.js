import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { scoresApi } from '../api/scores';
import { api } from '../api/client';
import { colors, hashSeed } from '../theme/colors';
import { type } from '../theme/typography';
import { FIELD_DEFS, QUICK_FIELD_DEFS, MORE_FIELD_DEFS, defaultFieldValue, DEFAULT_CATEGORIES } from '../constants/fieldDefs';
import NumberPillRow from '../components/NumberPillRow';
import PeopleScoresEditor from '../components/PeopleScoresEditor';
import FieldIcon from '../components/FieldIcon';
import PhotoStripe from '../components/PhotoStripe';

let tempIdSeq = 1;
const tempId = () => `tmp-${tempIdSeq++}`;

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Necesitamos acceso a tus fotos para continuar');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

export default function CreateScoreScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [ownerValue, setOwnerValue] = useState(null);
  const [category, setCategory] = useState('');
  const [categorySuggestions, setCategorySuggestions] = useState(DEFAULT_CATEGORIES);
  const [others, setOthers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fields, setFields] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    scoresApi
      .list()
      .then(({ items }) => {
        const set = new Set(DEFAULT_CATEGORIES);
        items.forEach((it) => it.category && set.add(it.category));
        setCategorySuggestions(Array.from(set));
      })
      .catch(() => {});
  }, []);

  const people = useMemo(
    () => [
      { id: 'owner', name: 'Tú', value: ownerValue, isOwner: true },
      ...others.map((o) => ({ ...o, isOwner: false })),
    ],
    [ownerValue, others]
  );

  const onSelectNumber = (personId, n) => {
    if (personId === 'owner') {
      setOwnerValue(n);
    } else {
      setOthers((prev) => prev.map((o) => (o.id === personId ? { ...o, value: n } : o)));
    }
    setEditingId(null);
  };

  const addOther = () => {
    const id = tempId();
    setOthers((prev) => [...prev, { id, name: 'Nuevo', value: 5 }]);
    setEditingId(id);
  };

  const renameOther = (id, name) => {
    setOthers((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const removeOther = (id) => {
    setOthers((prev) => prev.filter((o) => o.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
  };

  const addField = (def) => {
    setFields((prev) => [
      ...prev,
      { id: tempId(), typeId: def.id, label: def.label, value: defaultFieldValue(def.kind) },
    ]);
    setSheetOpen(false);
  };

  const removeField = (id) => setFields((prev) => prev.filter((f) => f.id !== id));

  const updateField = (id, patch) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const updateListItem = (fieldId, idx, value) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const next = f.value.slice();
        next[idx] = value;
        return { ...f, value: next };
      })
    );
  };

  const addListItem = (fieldId) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, value: [...f.value, ''] } : f)));
  };

  const pickForPhoto = async (fieldId) => {
    try {
      const uri = await pickImage();
      if (!uri) return;
      updateField(fieldId, { uploading: true });
      const url = await api.uploadPhoto(uri);
      updateField(fieldId, { value: url, uploading: false });
    } catch (e) {
      updateField(fieldId, { uploading: false });
      setError(e.message || 'No se pudo subir la foto');
    }
  };

  const pickForGallery = async (fieldId) => {
    try {
      const uri = await pickImage();
      if (!uri) return;
      updateField(fieldId, { uploading: true });
      const url = await api.uploadPhoto(uri);
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, value: [...f.value, url], uploading: false } : f))
      );
    } catch (e) {
      updateField(fieldId, { uploading: false });
      setError(e.message || 'No se pudo subir la foto');
    }
  };

  const save = async () => {
    setError('');
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!ownerValue) {
      setError('La puntuación (1-10) es obligatoria');
      return;
    }
    if (fields.some((f) => f.uploading)) {
      setError('Espera a que terminen de subirse las fotos');
      return;
    }
    setSaving(true);
    try {
      const coverField = fields.find(
        (f) => (f.typeId === 'photo' && f.value) || (f.typeId === 'gallery' && f.value?.length)
      );
      const coverPhotoUrl = coverField
        ? coverField.typeId === 'photo'
          ? coverField.value
          : coverField.value[0]
        : null;

      const { score } = await scoresApi.create({
        title: title.trim(),
        category: category.trim() || null,
        coverPhotoUrl,
        ownerValue,
        ratings: others.map((o) => ({ personName: o.name, value: o.value })),
        fields: fields.map((f) => ({ type: f.typeId, label: f.label, value: f.value })),
      });
      navigation.replace('Detail', { scoreId: score.id });
    } catch (e) {
      setError(e.message || 'No se pudo guardar la puntuación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={styles.backArrow} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.titleInput}
            placeholder="Título de tu puntuación"
            placeholderTextColor={colors.sub}
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Categoría</Text>
            <TextInput
              style={styles.categoryInput}
              placeholder="Ej. Restaurantes"
              placeholderTextColor={colors.sub}
              value={category}
              onChangeText={setCategory}
            />
            <View style={styles.categoryChips}>
              {categorySuggestions.map((c) => (
                <Pressable key={c} onPress={() => setCategory(c)} style={styles.categoryChip}>
                  <Text style={[type.chip, { color: colors.sub }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Puntuación (obligatoria)</Text>
            <NumberPillRow value={ownerValue} onSelect={(n) => onSelectNumber('owner', n)} />
          </View>

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Puntuaciones de otras personas (opcional)</Text>
            <PeopleScoresEditor
              people={people}
              editingId={editingId}
              onStartEdit={setEditingId}
              onSelectNumber={onSelectNumber}
              onRename={renameOther}
              onRemove={removeOther}
              onAdd={addOther}
            />
          </View>

          {fields.map((f) => (
            <FieldRow
              key={f.id}
              field={f}
              onRemove={() => removeField(f.id)}
              onLabelChange={(label) => updateField(f.id, { label })}
              onValueChange={(value) => updateField(f.id, { value })}
              onListItemChange={(idx, v) => updateListItem(f.id, idx, v)}
              onAddListItem={() => addListItem(f.id)}
              onPickPhoto={() => pickForPhoto(f.id)}
              onPickGalleryPhoto={() => pickForGallery(f.id)}
            />
          ))}

          <Text style={[type.scoreLabel, { color: colors.sub }]}>Añadir campo rápido</Text>
          <View style={styles.quickRow}>
            {QUICK_FIELD_DEFS.map((def) => (
              <Pressable key={def.id} style={styles.quickChip} onPress={() => addField(def)}>
                <FieldIcon type={def.icon} size={15} color={colors.accent} />
                <Text style={[type.quickChip, { color: colors.ink }]}>{def.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.quickChip} onPress={() => setSheetOpen(true)}>
              <Text style={{ fontSize: 15, color: colors.ink }}>···</Text>
              <Text style={[type.quickChip, { color: colors.ink }]}>Más campos</Text>
            </Pressable>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : (
              <Text style={[type.loginBtn, { color: colors.white }]}>Guardar puntuación</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.sheetGrab} />
            <Text style={[type.sheetTitle, { color: colors.ink }]}>Más campos</Text>
            <View style={styles.sheetGrid}>
              {MORE_FIELD_DEFS.map((def) => (
                <Pressable key={def.id} style={styles.sheetItem} onPress={() => addField(def)}>
                  <View style={styles.ficonWrap}>
                    <FieldIcon type={def.icon} size={18} color={colors.white} />
                  </View>
                  <Text style={[type.sheetItemLabel, { color: colors.ink }]}>{def.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FieldRow({ field, onRemove, onLabelChange, onValueChange, onListItemChange, onAddListItem, onPickPhoto, onPickGalleryPhoto }) {
  const def = FIELD_DEFS.find((d) => d.id === field.typeId);
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldHead}>
        <View style={styles.ficonWrap}>
          <FieldIcon type={def.icon} size={18} color={colors.white} />
        </View>
        <TextInput
          style={[type.fieldLabel, styles.fieldLabelInput, { color: colors.sub }]}
          value={field.label}
          onChangeText={onLabelChange}
        />
        <Pressable style={styles.fieldRemove} onPress={onRemove}>
          <Text style={styles.fieldRemoveText}>✕</Text>
        </Pressable>
      </View>

      {def.kind === 'simple' && (
        <TextInput
          style={styles.fieldInput}
          placeholder={def.placeholder}
          placeholderTextColor={colors.sub}
          value={field.value}
          onChangeText={onValueChange}
          keyboardType={def.keyboardType || 'default'}
        />
      )}

      {def.kind === 'list' && (
        <View style={{ gap: 8 }}>
          {field.value.map((v, idx) => (
            <TextInput
              key={idx}
              style={styles.fieldInput}
              placeholder="Añade un ítem..."
              placeholderTextColor={colors.sub}
              value={v}
              onChangeText={(text) => onListItemChange(idx, text)}
            />
          ))}
          <Pressable onPress={onAddListItem}>
            <Text style={[type.listAdd, { color: colors.accent }]}>+ Añadir ítem</Text>
          </Pressable>
        </View>
      )}

      {def.kind === 'photo' && (
        <Pressable style={styles.phMini} onPress={onPickPhoto}>
          {field.uploading ? (
            <ActivityIndicator color={colors.accent} />
          ) : field.value ? (
            <Image source={{ uri: field.value }} style={StyleSheet.absoluteFill} />
          ) : (
            <PhotoStripe seed={hashSeed(field.id)} style={StyleSheet.absoluteFill} />
          )}
        </Pressable>
      )}

      {def.kind === 'gallery' && (
        <View style={styles.phGrid}>
          {field.value.map((url, idx) => (
            <Image key={idx} source={{ uri: url }} style={styles.phMiniGridItem} />
          ))}
          <Pressable style={[styles.phMiniGridItem, styles.addPhotoTile]} onPress={onPickGalleryPhoto}>
            {field.uploading ? <ActivityIndicator color={colors.sub} /> : <Text style={styles.addPhotoPlus}>+</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: 14, paddingTop: 22, paddingBottom: 4 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 8,
    height: 8,
    marginLeft: 3,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: colors.ink,
    transform: [{ rotate: '45deg' }],
  },
  body: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 60, gap: 16 },
  titleInput: { fontFamily: 'Nunito_900Black', fontSize: 24, color: colors.ink, padding: 0 },
  section: { gap: 8 },
  categoryInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  fieldRow: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ficonWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accent2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelInput: { flex: 1, padding: 0 },
  fieldRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRemoveText: { fontSize: 11, fontWeight: '700', color: colors.sub },
  fieldInput: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14.5,
    color: colors.ink,
    padding: 0,
  },
  phMini: { width: '100%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  phGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  phMiniGridItem: { width: '31.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
  addPhotoTile: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPlus: { fontSize: 20, fontWeight: '800', color: colors.sub },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontFamily: 'Nunito_700Bold', fontSize: 12.5, color: '#c0392b', textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: colors.surface,
    gap: 14,
  },
  sheetGrab: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center' },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sheetItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
