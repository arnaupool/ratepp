import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scoresApi } from '../api/scores';
import { colorsApi } from '../api/colors';
import { api } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import { QUICK_FIELD_DEFS, defaultFieldValue, DEFAULT_CATEGORIES } from '../constants/fieldDefs';
import NumberPillRow from '../components/NumberPillRow';
import PeopleScoresEditor from '../components/PeopleScoresEditor';
import CategoryEditor from '../components/CategoryEditor';
import FieldIcon from '../components/FieldIcon';
import EditableFieldRow from '../components/EditableFieldRow';
import LocationPickerOverlay from '../components/LocationPickerOverlay';
import PhotoGalleryEditor from '../components/PhotoGalleryEditor';
import CoverPickerOverlay from '../components/CoverPickerOverlay';
import ColorPicker from '../components/ColorPicker';
import DismissKeyboardView from '../components/DismissKeyboardView';
import { animateNext } from '../utils/animate';
import { pickImage } from '../utils/pickImage';

let tempIdSeq = 1;
const tempId = () => `tmp-${tempIdSeq++}`;

export default function CreateScoreScreen({ navigation }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [ownerValue, setOwnerValue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categorySuggestions, setCategorySuggestions] = useState(DEFAULT_CATEGORIES);
  const [others, setOthers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fields, setFields] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [cardColor, setCardColor] = useState(null);
  const [suggestedColor, setSuggestedColor] = useState(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [locationFieldId, setLocationFieldId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    scoresApi
      .list()
      .then(({ items }) => {
        const set = new Set(DEFAULT_CATEGORIES);
        items.forEach((it) => (it.categories || []).forEach((c) => set.add(c)));
        setCategorySuggestions(Array.from(set));
      })
      .catch(() => {});
  }, []);

  // Suggests a card color from the cover photo (photos[0]) whenever it
  // changes — best-effort only, a failed/unsupported extraction just leaves
  // suggestedColor null and the picker simply won't show the "from photo"
  // swatch.
  const coverUrl = photos[0] || null;
  useEffect(() => {
    if (!coverUrl) {
      setSuggestedColor(null);
      return;
    }
    let cancelled = false;
    colorsApi
      .dominant(coverUrl)
      .then(({ color }) => {
        if (!cancelled) setSuggestedColor(color);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  const toggleCategory = (c) => {
    animateNext();
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const addCustomCategory = (c) => {
    if (!categories.includes(c)) {
      animateNext();
      setCategories((prev) => [...prev, c]);
    }
    if (!categorySuggestions.includes(c)) setCategorySuggestions((prev) => [...prev, c]);
  };

  const onSelectNumber = (personId, n) => {
    if (personId === 'owner') {
      setOwnerValue(n);
    } else {
      setOthers((prev) => prev.map((o) => (o.id === personId ? { ...o, value: n } : o)));
    }
    setEditingId(null);
  };

  const addOther = () => {
    animateNext();
    const id = tempId();
    setOthers((prev) => [...prev, { id, name: 'Nuevo', value: 5 }]);
    setEditingId(id);
  };

  const renameOther = (id, name) => {
    setOthers((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const removeOther = (id) => {
    animateNext();
    setOthers((prev) => prev.filter((o) => o.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
  };

  const addField = (def) => {
    animateNext();
    setFields((prev) => [
      ...prev,
      { id: tempId(), type: def.id, label: def.label, value: defaultFieldValue(def.kind) },
    ]);
  };

  const removeField = (id) => {
    animateNext();
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const moveField = (id, dir) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[target], next[idx]] = [next[idx], next[target]];
      return next;
    });
    animateNext();
  };

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
    animateNext();
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, value: [...f.value, ''] } : f)));
  };

  const pickForGallery = async (fieldId) => {
    try {
      const uri = await pickImage();
      if (!uri) return;
      updateField(fieldId, { uploading: true });
      const url = await api.uploadPhoto(uri);
      animateNext();
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, value: [...f.value, url], uploading: false } : f))
      );
    } catch (e) {
      updateField(fieldId, { uploading: false });
      setError(e.message || 'No se pudo subir la foto');
    }
  };

  const removeGalleryPhoto = (fieldId, idx) => {
    animateNext();
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value: f.value.filter((_, i) => i !== idx) } : f))
    );
  };

  const openLocationPicker = (fieldId) => {
    Keyboard.dismiss();
    setLocationFieldId(fieldId);
  };

  const openCoverSearch = () => {
    Keyboard.dismiss();
    setCoverPickerOpen(true);
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
      const { score } = await scoresApi.create({
        title: title.trim(),
        categories,
        photoUrls: photos,
        cardColor,
        ownerValue,
        ratings: others.map((o) => ({ personName: o.name.trim() || 'Invitado', value: o.value })),
        fields: fields.map((f) => ({ type: f.type, label: f.label, value: f.value })),
      });
      navigation.replace('Detail', { scoreId: score.id });
    } catch (e) {
      setError(e.message || 'No se pudo guardar la puntuación');
    } finally {
      setSaving(false);
    }
  };

  const editingLocationField = fields.find((f) => f.id === locationFieldId);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={[styles.backBtn, { backgroundColor: 'rgba(128,128,128,0.15)' }]} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <View style={[styles.backArrow, { borderColor: colors.ink }]} />
        </Pressable>
      </View>

      {/* 'height' on Android, not the no-op undefined: without a native
          rebuild setting windowSoftInputMode=adjustResize, Android gets no
          keyboard compensation at all from 'undefined'. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* DismissKeyboardView wraps the ScrollView's rendered content, not
            the ScrollView itself: wrapping the scrollable container directly
            in TouchableWithoutFeedback (native's only real tap-to-dismiss
            mechanism) blocked scrolling over its content on-device. */}
        {/* On native, DismissKeyboardView renders a real wrapping View, so
            styles.body (padding/gap) is applied there. On web it's a
            transparent Fragment, so the same style is applied here instead
            — otherwise its children (flattened directly into this
            ScrollView's content container on web) would render with no
            spacing at all. */}
        <ScrollView contentContainerStyle={Platform.OS === 'web' ? styles.body : undefined} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <DismissKeyboardView style={styles.body}>
          <TextInput
            style={[styles.titleInput, { color: colors.ink }]}
            placeholder="Título *"
            placeholderTextColor={colors.sub}
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Fotos</Text>
            <PhotoGalleryEditor photos={photos} onChange={setPhotos} onError={setError} onOpenCoverSearch={openCoverSearch} />
          </View>

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Categorías</Text>
            <CategoryEditor
              categories={categories}
              suggestions={categorySuggestions}
              onToggle={toggleCategory}
              onAddCustom={addCustomCategory}
            />
          </View>

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Color de la card</Text>
            <ColorPicker value={cardColor} onChange={setCardColor} suggestedColor={suggestedColor} />
          </View>

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Nota *</Text>
            <NumberPillRow value={ownerValue} onSelect={(n) => onSelectNumber('owner', n)} />
          </View>

          <View style={styles.section}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Nota adicional</Text>
            <PeopleScoresEditor
              people={others.map((o) => ({ ...o, isOwner: false }))}
              editingId={editingId}
              onStartEdit={(id) => setEditingId((cur) => (cur === id ? null : id))}
              onSelectNumber={onSelectNumber}
              onRename={renameOther}
              onRemove={removeOther}
              onAdd={addOther}
            />
          </View>

          {fields.map((f, idx) => (
            <EditableFieldRow
              key={f.id}
              field={f}
              isFirst={idx === 0}
              isLast={idx === fields.length - 1}
              onRemove={() => removeField(f.id)}
              onMoveUp={() => moveField(f.id, -1)}
              onMoveDown={() => moveField(f.id, 1)}
              onLabelChange={(label) => updateField(f.id, { label })}
              onLabelCommit={() => {}}
              onValueChange={(value) => updateField(f.id, { value })}
              onValueCommit={() => {}}
              onListItemChange={(idx2, v) => updateListItem(f.id, idx2, v)}
              onAddListItem={() => addListItem(f.id)}
              onPickGalleryPhoto={() => pickForGallery(f.id)}
              onRemoveGalleryPhoto={(idx2) => removeGalleryPhoto(f.id, idx2)}
              onPickLocation={() => openLocationPicker(f.id)}
            />
          ))}

          <Text style={[type.scoreLabel, { color: colors.sub }]}>Añadir campo</Text>
          <View style={styles.quickRow}>
            {QUICK_FIELD_DEFS.map((def) => (
              <Pressable key={def.id} style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={() => addField(def)}>
                <FieldIcon type={def.icon} size={15} color={colors.accent} />
                <Text style={[type.quickChip, { color: colors.ink }]}>{def.label}</Text>
              </Pressable>
            ))}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : (
              <Text style={[type.loginBtn, { color: colors.white }]}>Guardar puntuación</Text>
            )}
          </Pressable>
        </DismissKeyboardView>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerOverlay
        visible={!!editingLocationField}
        initialValue={editingLocationField?.value}
        onClose={() => setLocationFieldId(null)}
        onConfirm={(value) => {
          updateField(locationFieldId, { value });
          setLocationFieldId(null);
        }}
      />

      <CoverPickerOverlay
        visible={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        onConfirm={(url) => {
          setPhotos((prev) => [...prev, url]);
          setCoverPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { paddingHorizontal: 14, paddingTop: 22, paddingBottom: 4 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 8,
    height: 8,
    marginLeft: 3,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: '45deg' }],
  },
  body: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 60, gap: 16 },
  titleInput: { fontFamily: 'Poppins_900Black', fontSize: 24, padding: 0 },
  section: { gap: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontFamily: 'Poppins_700Bold', fontSize: 12.5, color: '#c0392b', textAlign: 'center' },
});
