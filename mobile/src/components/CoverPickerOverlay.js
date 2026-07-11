import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { coversApi } from '../api/covers';
import { COVER_TYPES } from '../constants/fieldDefs';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

export default function CoverPickerOverlay({ visible, onClose, onConfirm }) {
  const [mediaType, setMediaType] = useState('movie');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  if (!visible) return null;

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const { results: found, note } = await coversApi.search(mediaType, query.trim());
      setResults(found || []);
      if ((!found || found.length === 0) && note) setError(note);
    } catch (e) {
      setError(e.message || 'No se pudo buscar');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetGrab} />
        <Text style={[type.sheetTitle, { color: colors.ink }]}>Buscar carátula</Text>

        <View style={styles.typeRow}>
          {COVER_TYPES.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.typeChip, mediaType === t.id && styles.typeChipOn]}
              onPress={() => setMediaType(t.id)}
            >
              <Text style={[type.chip, { color: mediaType === t.id ? colors.accentInk : colors.sub }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Título..."
            placeholderTextColor={colors.sub}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          <Pressable style={styles.searchBtn} onPress={runSearch}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
          </Pressable>
        </View>

        <View style={styles.resultsWrap}>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
          ) : !!error ? (
            <Text style={[type.editContext, { color: colors.sub, textAlign: 'center', marginTop: 12 }]}>{error}</Text>
          ) : searched && results.length === 0 ? (
            <Text style={[type.editContext, { color: colors.sub, textAlign: 'center', marginTop: 12 }]}>Sin resultados</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.grid}>
              {results.map((r) => (
                <Pressable key={r.id} style={styles.card} onPress={() => onConfirm(r.posterUrl)}>
                  <Image source={{ uri: r.posterUrl }} style={styles.poster} />
                  <Text style={[type.personName, { color: colors.ink }]} numberOfLines={1}>{r.title}</Text>
                  {!!r.subtitle && (
                    <Text style={[type.editContext, { color: colors.sub }]} numberOfLines={1}>{r.subtitle}</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={[type.loginBtn, { color: colors.sub }]}>Cerrar</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    zIndex: 60,
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    gap: 12,
    maxHeight: '85%',
  },
  sheetGrab: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  typeChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  resultsWrap: { minHeight: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 8 },
  card: { width: '31%', gap: 3 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: colors.bg },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
