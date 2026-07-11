import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { scoresApi } from '../api/scores';
import { colors, hashSeed } from '../theme/colors';
import { type } from '../theme/typography';
import PhotoStripe from '../components/PhotoStripe';
import TagChip from '../components/TagChip';
import PeopleScoresEditor from '../components/PeopleScoresEditor';
import ScoreBadge from '../components/ScoreBadge';
import NumberPillRow from '../components/NumberPillRow';
import FieldIcon from '../components/FieldIcon';
import MapPreview from '../components/MapPreview';
import PhotoGalleryEditor from '../components/PhotoGalleryEditor';
import PhotoLightbox from '../components/PhotoLightbox';
import AnimatedSheet from '../components/AnimatedSheet';
import { formatDate } from '../components/DateField';
import { FIELD_DEFS, QUICK_FIELD_DEFS, MORE_FIELD_DEFS, defaultFieldValue } from '../constants/fieldDefs';
import { animateNext } from '../utils/animate';

export default function DetailScreen({ route, navigation }) {
  const { scoreId } = route.params;
  const insets = useSafeAreaInsets();
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [fieldSheetOpen, setFieldSheetOpen] = useState(false);
  const [lightboxUri, setLightboxUri] = useState(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const { score: fetched } = await scoresApi.get(scoreId);
      setScore(fetched);
    } catch (e) {
      setError(e.message || 'No se pudo cargar la puntuación');
    } finally {
      setLoading(false);
    }
  }, [scoreId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const photos = score?.photoUrls || [];

  const ownerRating = useMemo(() => score?.ratings.find((r) => r.isOwner), [score]);

  const otherPeople = useMemo(() => {
    if (!score) return [];
    return score.ratings
      .filter((r) => !r.isOwner)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({ id: r.id, name: r.personName, value: r.value, isOwner: false }));
  }, [score]);

  const updateRatingLocally = (ratingId, patch) => {
    setScore((s) => ({
      ...s,
      ratings: s.ratings.map((r) => (r.id === ratingId ? { ...r, ...patch } : r)),
    }));
  };

  const onSelectNumber = async (personId, n) => {
    updateRatingLocally(personId, { value: n });
    setEditingId(null);
    try {
      await scoresApi.updateRating(scoreId, personId, { value: n });
    } catch (e) {
      setError(e.message || 'No se pudo guardar la puntuación');
      load();
    }
  };

  const onRename = (personId, name) => updateRatingLocally(personId, { personName: name });

  const onRenameCommit = async (personId) => {
    const rating = score.ratings.find((r) => r.id === personId);
    if (!rating) return;
    const name = rating.personName.trim() || 'Invitado';
    if (name !== rating.personName) updateRatingLocally(personId, { personName: name });
    try {
      await scoresApi.updateRating(scoreId, personId, { personName: name });
    } catch (e) {
      setError(e.message || 'No se pudo renombrar');
    }
  };

  const onAddPerson = async () => {
    try {
      const { rating } = await scoresApi.addRating(scoreId, { personName: 'Nuevo', value: 5 });
      animateNext();
      setScore((s) => ({ ...s, ratings: [...s.ratings, rating] }));
      setEditingId(rating.id);
    } catch (e) {
      setError(e.message || 'No se pudo añadir la persona');
    }
  };

  const onRemove = async (personId) => {
    const prev = score.ratings;
    animateNext();
    setScore((s) => ({ ...s, ratings: s.ratings.filter((r) => r.id !== personId) }));
    setEditingId((cur) => (cur === personId ? null : cur));
    try {
      await scoresApi.removeRating(scoreId, personId);
    } catch (e) {
      setError(e.message || 'No se pudo quitar');
      animateNext();
      setScore((s) => ({ ...s, ratings: prev }));
    }
  };

  const onPhotosChange = async (newPhotos) => {
    const prev = score.photoUrls;
    setActiveIndex(0);
    setScore((s) => ({ ...s, photoUrls: newPhotos }));
    try {
      await scoresApi.update(scoreId, { photoUrls: newPhotos });
    } catch (e) {
      setError(e.message || 'No se pudo actualizar la galería');
      setScore((s) => ({ ...s, photoUrls: prev }));
    }
  };

  const onAddField = async (def) => {
    try {
      const { field } = await scoresApi.addField(scoreId, {
        type: def.id,
        label: def.label,
        value: defaultFieldValue(def.kind),
      });
      animateNext();
      setScore((s) => ({ ...s, fields: [...s.fields, field] }));
      setFieldSheetOpen(false);
    } catch (e) {
      setError(e.message || 'No se pudo añadir el campo');
    }
  };

  const onRemoveField = async (fieldId) => {
    const prev = score.fields;
    animateNext();
    setScore((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== fieldId) }));
    try {
      await scoresApi.removeField(scoreId, fieldId);
    } catch (e) {
      setError(e.message || 'No se pudo quitar el campo');
      animateNext();
      setScore((s) => ({ ...s, fields: prev }));
    }
  };

  const onRemoveGalleryPhoto = async (fieldId, idx) => {
    const field = score.fields.find((f) => f.id === fieldId);
    if (!field) return;
    const prevValue = field.value;
    const nextValue = field.value.filter((_, i) => i !== idx);
    animateNext();
    setScore((s) => ({ ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, value: nextValue } : f)) }));
    try {
      await scoresApi.updateField(scoreId, fieldId, { value: nextValue });
    } catch (e) {
      setError(e.message || 'No se pudo quitar la foto');
      setScore((s) => ({ ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, value: prevValue } : f)) }));
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error && !score) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={{ fontFamily: 'Nunito_700Bold', color: colors.sub }}>{error}</Text>
      </View>
    );
  }

  if (!score) return null;

  const heroUri = photos[activeIndex] || photos[0];

  return (
    <View style={styles.screen}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {editMode ? (
          <View style={[styles.editHero, { paddingTop: insets.top + 14 }]}>
            <View style={styles.editHeroHead}>
              <Pressable style={styles.backBtnDark} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
                <View style={styles.backArrow} />
              </Pressable>
              <Pressable style={styles.doneBtn} onPress={() => setEditMode(false)}>
                <Text style={[type.chip, { color: colors.white }]}>Listo</Text>
              </Pressable>
            </View>
            <Text style={[type.scoreLabel, { color: colors.sub, marginTop: 10 }]}>Fotos</Text>
            <PhotoGalleryEditor photos={photos} onChange={onPhotosChange} onError={setError} />
          </View>
        ) : (
          <View style={styles.heroWrap}>
            {heroUri ? (
              <Pressable onPress={() => setLightboxUri(heroUri)}>
                <Image source={{ uri: heroUri }} style={styles.hero} />
              </Pressable>
            ) : (
              <PhotoStripe seed={hashSeed(score.id)} style={styles.hero} />
            )}
            <Pressable
              style={[styles.backBtn, { top: insets.top + 14 }]}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Volver"
            >
              <View style={styles.backArrow} />
            </Pressable>
            <Pressable
              style={[styles.editModeBtn, { top: insets.top + 14 }]}
              onPress={() => setEditMode(true)}
              accessibilityLabel="Editar puntuación"
            >
              <Text style={{ fontSize: 14 }}>✎</Text>
            </Pressable>
          </View>
        )}

        {!editMode && photos.length > 1 && (
          <View style={styles.thumbRow}>
            {photos.map((url, idx) => (
              <Pressable
                key={`${url}-${idx}`}
                onPress={() => setActiveIndex(idx)}
                onLongPress={() => setLightboxUri(url)}
                style={styles.thumbWrap}
              >
                <Image source={{ uri: url }} style={[styles.thumb, idx === activeIndex && styles.thumbActive]} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.content}>
          <Text style={[type.detailTitle, { color: colors.ink }]}>{score.title}</Text>
          {score.categories?.length > 0 && (
            <View style={styles.categoryRow}>
              {score.categories.map((c) => (
                <TagChip key={c} label={c} />
              ))}
            </View>
          )}
          {!!error && <Text style={styles.errorBanner}>{error}</Text>}

          <View style={styles.ownerRow}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Tu puntuación</Text>
            {ownerRating && (
              <View style={styles.ownerScoreRow}>
                <ScoreBadge value={ownerRating.value} size={40} />
                <View style={{ flex: 1 }}>
                  <NumberPillRow value={ownerRating.value} onSelect={(n) => onSelectNumber(ownerRating.id, n)} />
                </View>
              </View>
            )}
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Puntuaciones de otras personas</Text>
            <PeopleScoresEditor
              people={otherPeople}
              editingId={editingId}
              onStartEdit={(id) => setEditingId((cur) => (cur === id ? null : id))}
              onSelectNumber={onSelectNumber}
              onRename={onRename}
              onRenameCommit={onRenameCommit}
              onRemove={onRemove}
              onAdd={onAddPerson}
            />
          </View>
        </View>

        {(score.fields.length > 0 || editMode) && (
          <View style={styles.fieldsCard}>
            {score.fields.map((f, idx) => (
              <DetailFieldRow
                key={f.id}
                field={f}
                isLast={idx === score.fields.length - 1 && !editMode}
                editMode={editMode}
                onRemove={() => onRemoveField(f.id)}
                onRemoveGalleryPhoto={(idx2) => onRemoveGalleryPhoto(f.id, idx2)}
                onPhotoPress={setLightboxUri}
              />
            ))}
            {editMode && (
              <View style={styles.addFieldRow}>
                {QUICK_FIELD_DEFS.map((def) => (
                  <Pressable key={def.id} style={styles.quickChip} onPress={() => onAddField(def)}>
                    <FieldIcon type={def.icon} size={15} color={colors.accent} />
                    <Text style={[type.quickChip, { color: colors.ink }]}>{def.label}</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.quickChip} onPress={() => setFieldSheetOpen(true)}>
                  <Text style={{ fontSize: 15, color: colors.ink }}>···</Text>
                  <Text style={[type.quickChip, { color: colors.ink }]}>Más campos</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <AnimatedSheet visible={fieldSheetOpen} onClose={() => setFieldSheetOpen(false)}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetGrab} />
          <Text style={[type.sheetTitle, { color: colors.ink }]}>Más campos</Text>
          <View style={styles.sheetGrid}>
            {MORE_FIELD_DEFS.map((def) => (
              <Pressable key={def.id} style={styles.sheetItem} onPress={() => onAddField(def)}>
                <View style={styles.ficonWrap}>
                  <FieldIcon type={def.icon} size={18} color={colors.white} />
                </View>
                <Text style={[type.sheetItemLabel, { color: colors.ink }]}>{def.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </AnimatedSheet>

      <PhotoLightbox visible={!!lightboxUri} uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </View>
  );
}

function DetailFieldRow({ field, isLast, editMode, onRemove, onRemoveGalleryPhoto, onPhotoPress }) {
  const def = FIELD_DEFS.find((d) => d.id === field.type);
  return (
    <View style={[styles.fieldRow, !isLast && styles.fieldRowDivider]}>
      <View style={styles.fieldHead}>
        <View style={styles.ficonWrapSm}>
          <FieldIcon type={def?.icon} size={13} color={colors.white} />
        </View>
        <Text style={[type.detailFieldLabel, styles.fieldHeadLabel, { color: colors.sub }]}>{field.label}</Text>
        {editMode && (
          <Pressable style={styles.fieldRemove} onPress={onRemove} accessibilityLabel={`Quitar campo ${field.label}`}>
            <Text style={styles.fieldRemoveText}>✕</Text>
          </Pressable>
        )}
      </View>

      {field.type === 'list' && Array.isArray(field.value) && (
        <View style={styles.fieldValue}>
          {field.value.filter(Boolean).map((item, idx) => (
            <Text key={idx} style={[type.detailFieldValue, { color: colors.ink }]}>— {item}</Text>
          ))}
        </View>
      )}

      {field.type === 'photo' && field.value && (
        <Pressable onPress={() => onPhotoPress(field.value)}>
          <Image source={{ uri: field.value }} style={styles.fieldPhoto} />
        </Pressable>
      )}

      {field.type === 'gallery' && Array.isArray(field.value) && field.value.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fieldValue}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {field.value.map((url, idx) => (
              <View key={idx}>
                <Pressable onPress={() => onPhotoPress(url)}>
                  <Image source={{ uri: url }} style={styles.fieldGalleryThumb} />
                </Pressable>
                {editMode && (
                  <Pressable
                    style={styles.galleryThumbRemove}
                    onPress={() => onRemoveGalleryPhoto(idx)}
                    accessibilityLabel="Quitar foto"
                  >
                    <Text style={styles.galleryThumbRemoveText}>✕</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {field.type === 'date' && !!field.value && (
        <Text style={[type.detailFieldValue, styles.fieldValue, { color: colors.ink }]}>{formatDate(field.value)}</Text>
      )}

      {field.type === 'location' && !!field.value && (
        <View style={styles.fieldValue}>
          <MapPreview value={field.value} height={140} />
        </View>
      )}

      {field.type === 'tag' && Array.isArray(field.value) && field.value.length > 0 && (
        <View style={[styles.fieldValue, styles.tagRow]}>
          {field.value.map((t) => (
            <TagChip key={t} label={t} />
          ))}
        </View>
      )}

      {!['list', 'photo', 'gallery', 'date', 'location', 'tag'].includes(field.type) && (
        <Text style={[type.detailFieldValue, styles.fieldValue, { color: colors.ink }]}>{field.value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroWrap: { width: '100%' },
  hero: { width: '100%', aspectRatio: 4 / 3 },
  editHero: { paddingHorizontal: 18, paddingBottom: 8, backgroundColor: colors.surface },
  editHeroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtnDark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.accent,
  },
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModeBtn: {
    position: 'absolute',
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.85)',
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
  thumbRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 14 },
  thumbWrap: { flex: 1 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: 10, opacity: 0.6 },
  thumbActive: { opacity: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  ownerRow: { marginTop: 16, gap: 8 },
  ownerScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldsCard: {
    marginHorizontal: 18,
    marginTop: 18,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  fieldRow: { padding: 13, paddingHorizontal: 16, gap: 5 },
  fieldRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldHeadLabel: { flex: 1 },
  ficonWrapSm: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.accent2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRemoveText: { fontSize: 11, fontWeight: '700', color: colors.sub },
  fieldValue: { paddingLeft: 32 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  errorBanner: { fontFamily: 'Nunito_700Bold', fontSize: 12.5, color: '#c0392b', marginTop: 10 },
  fieldPhoto: { marginLeft: 32, width: 90, height: 90, borderRadius: 10 },
  fieldGalleryThumb: { width: 70, height: 70, borderRadius: 10 },
  galleryThumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryThumbRemoveText: { fontSize: 9, fontWeight: '700', color: colors.white },
  addFieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 13, paddingHorizontal: 16 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ficonWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accent2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
