import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { coversApi } from '../api/covers';
import { COVER_TYPES } from '../constants/fieldDefs';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import AnimatedSheet from './AnimatedSheet';

// A literal pixel cap instead of a '%'-based maxHeight: percentage heights
// need a definite-height ancestor to resolve against, and this sheet's
// direct parents (the KeyboardAvoidingView/Animated.View in AnimatedSheet)
// are both content-sized (no explicit height) — so on native, Yoga has
// nothing to resolve the percentage against and the sheet was rendering
// with an effectively-uncapped or wrongly-capped height, appearing to end
// abruptly partway down the screen.
const MAX_SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

const EMPTY_TAB_STATE = { query: '', results: [], loading: false, error: '', searched: false };

export default function CoverPickerOverlay({ visible, onClose, onConfirm }) {
  const { colors } = useTheme();
  const [mediaType, setMediaType] = useState('movie');
  // Each tab (movie/tv/game/book) keeps its own query+results, so switching
  // tabs doesn't leak the previous tab's search into the new one.
  const [tabState, setTabState] = useState({});
  const current = tabState[mediaType] || EMPTY_TAB_STATE;

  const patchTab = (type, patch) =>
    setTabState((prev) => ({ ...prev, [type]: { ...(prev[type] || EMPTY_TAB_STATE), ...patch } }));

  const runSearch = async () => {
    const tabType = mediaType;
    const searchQuery = (tabState[tabType]?.query || '').trim();
    if (!searchQuery) return;
    patchTab(tabType, { loading: true, error: '', searched: true });
    try {
      const { results: found, note } = await coversApi.search(tabType, searchQuery);
      patchTab(tabType, { results: found || [], loading: false, error: !found?.length && note ? note : '' });
    } catch (e) {
      patchTab(tabType, { results: [], loading: false, error: e.message || 'No se pudo buscar' });
    }
  };

  return (
    <AnimatedSheet visible={visible} onClose={onClose}>
      <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
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
            value={current.query}
            onChangeText={(v) => patchTab(mediaType, { query: v })}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          <Pressable style={[styles.searchBtn, { backgroundColor: colors.bg, borderColor: colors.line }]} onPress={runSearch}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
          </Pressable>
        </View>

        <View style={styles.resultsWrap}>
          {current.loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
          ) : !!current.error ? (
            <Text style={[type.editContext, { color: colors.sub, textAlign: 'center', marginTop: 12 }]}>{current.error}</Text>
          ) : current.searched && current.results.length === 0 ? (
            <Text style={[type.editContext, { color: colors.sub, textAlign: 'center', marginTop: 12 }]}>Sin resultados</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {current.results.map((r) => (
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
    maxHeight: MAX_SHEET_HEIGHT,
    overflow: 'hidden',
  },
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
  resultsWrap: { minHeight: 120, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 8 },
  card: { width: '31%', gap: 3 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 10 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
});
