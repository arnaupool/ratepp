import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { coversApi } from '../api/covers';
import { COVER_TYPES } from '../constants/fieldDefs';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import AnimatedSheet from './AnimatedSheet';

export default function CoverPickerOverlay({ visible, onClose, onConfirm }) {
  const { colors } = useTheme();
  const [mediaType, setMediaType] = useState('movie');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

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
    <AnimatedSheet visible={visible} onClose={onClose}>
      <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
        <View style={styles.sheetGrab} />
        <Text style={[type.sheetTitle, { color: colors.ink }]}>Buscar carátula</Text>

        <View style={styles.typeRow}>
          {COVER_TYPES.map((t) => (
            <Pressable
              key={t.id}
              style={[
                styles.typeChip,
                mediaType === t.id
                  ? { backgroundColor: colors.accent, borderColor: colors.accent }
                  : { backgroundColor: colors.bg, borderColor: colors.line },
              ]}
              onPress={() => setMediaType(t.id)}
            >
              <Text style={[type.chip, { color: mediaType === t.id ? colors.accentInk : colors.sub }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.bg, borderColor: colors.line, color: colors.ink }]}
            placeholder="Título..."
            placeholderTextColor={colors.sub}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          <Pressable style={[styles.searchBtn, { backgroundColor: colors.bg, borderColor: colors.line }]} onPress={runSearch}>
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
                  <Image source={{ uri: r.posterUrl }} style={[styles.poster, { backgroundColor: colors.bg }]} />
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
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 12,
    maxHeight: '85%',
  },
  sheetGrab: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  resultsWrap: { minHeight: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 8 },
  card: { width: '31%', gap: 3 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 10 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
