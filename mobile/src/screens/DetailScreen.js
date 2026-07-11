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
import FieldIcon from '../components/FieldIcon';
import { FIELD_DEFS } from '../constants/fieldDefs';

export default function DetailScreen({ route, navigation }) {
  const { scoreId } = route.params;
  const insets = useSafeAreaInsets();
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingId, setEditingId] = useState(null);

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

  const photos = useMemo(() => {
    if (!score) return [];
    const list = [];
    if (score.coverPhotoUrl) list.push(score.coverPhotoUrl);
    (score.fields || []).forEach((f) => {
      if (f.type === 'photo' && f.value && !list.includes(f.value)) list.push(f.value);
      if (f.type === 'gallery' && Array.isArray(f.value)) {
        f.value.forEach((url) => !list.includes(url) && list.push(url));
      }
    });
    return list;
  }, [score]);

  const people = useMemo(() => {
    if (!score) return [];
    return score.ratings
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({ id: r.id, name: r.personName, value: r.value, isOwner: r.isOwner }));
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
      setScore((s) => ({ ...s, ratings: [...s.ratings, rating] }));
      setEditingId(rating.id);
    } catch (e) {
      setError(e.message || 'No se pudo añadir la persona');
    }
  };

  const onRemove = async (personId) => {
    const prev = score.ratings;
    setScore((s) => ({ ...s, ratings: s.ratings.filter((r) => r.id !== personId) }));
    setEditingId((cur) => (cur === personId ? null : cur));
    try {
      await scoresApi.removeRating(scoreId, personId);
    } catch (e) {
      setError(e.message || 'No se pudo quitar');
      setScore((s) => ({ ...s, ratings: prev }));
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
        <View style={styles.heroWrap}>
          {heroUri ? (
            <Image source={{ uri: heroUri }} style={styles.hero} />
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
        </View>

        {photos.length > 1 && (
          <View style={styles.thumbRow}>
            {photos.map((url, idx) => (
              <Pressable key={url} onPress={() => setActiveIndex(idx)} style={styles.thumbWrap}>
                <Image source={{ uri: url }} style={[styles.thumb, idx === activeIndex && styles.thumbActive]} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.content}>
          <Text style={[type.detailTitle, { color: colors.ink }]}>{score.title}</Text>
          <TagChip label={score.category} style={{ marginTop: 8 }} />
          {!!error && <Text style={styles.errorBanner}>{error}</Text>}

          <PeopleScoresEditor
            people={people}
            editingId={editingId}
            onStartEdit={(id) => setEditingId((cur) => (cur === id ? null : id))}
            onSelectNumber={onSelectNumber}
            onRename={onRename}
            onRenameCommit={onRenameCommit}
            onRemove={onRemove}
            onAdd={onAddPerson}
          />
        </View>

        {score.fields.length > 0 && (
          <View style={styles.fieldsCard}>
            {score.fields.map((f, idx) => (
              <DetailFieldRow key={f.id} field={f} isLast={idx === score.fields.length - 1} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DetailFieldRow({ field, isLast }) {
  const def = FIELD_DEFS.find((d) => d.id === field.type);
  return (
    <View style={[styles.fieldRow, !isLast && styles.fieldRowDivider]}>
      <View style={styles.fieldHead}>
        <View style={styles.ficonWrapSm}>
          <FieldIcon type={def?.icon} size={13} color={colors.white} />
        </View>
        <Text style={[type.detailFieldLabel, { color: colors.sub }]}>{field.label}</Text>
      </View>

      {field.type === 'list' && Array.isArray(field.value) && (
        <View style={styles.fieldValue}>
          {field.value.filter(Boolean).map((item, idx) => (
            <Text key={idx} style={[type.detailFieldValue, { color: colors.ink }]}>— {item}</Text>
          ))}
        </View>
      )}

      {field.type === 'photo' && field.value && (
        <Image source={{ uri: field.value }} style={styles.fieldPhoto} />
      )}

      {field.type === 'gallery' && Array.isArray(field.value) && field.value.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fieldValue}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {field.value.map((url, idx) => (
              <Image key={idx} source={{ uri: url }} style={styles.fieldGalleryThumb} />
            ))}
          </View>
        </ScrollView>
      )}

      {!['list', 'photo', 'gallery'].includes(field.type) && (
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
  ficonWrapSm: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.accent2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldValue: { paddingLeft: 32 },
  errorBanner: { fontFamily: 'Nunito_700Bold', fontSize: 12.5, color: '#c0392b', marginTop: 10 },
  fieldPhoto: { marginLeft: 32, width: 90, height: 90, borderRadius: 10 },
  fieldGalleryThumb: { width: 70, height: 70, borderRadius: 10 },
});
