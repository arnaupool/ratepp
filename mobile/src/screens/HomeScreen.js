import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { scoresApi } from '../api/scores';
import { categoriesApi } from '../api/categories';
import { tagsApi } from '../api/tags';
import { categoryTint, hashSeed } from '../theme/palettes';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import PhotoStripe from '../components/PhotoStripe';
import ScoreBadge from '../components/ScoreBadge';
import ScoreStack from '../components/ScoreStack';
import TagChip from '../components/TagChip';
import FilterChip from '../components/FilterChip';
import SideMenu from '../components/SideMenu';
import AnimatedSheet from '../components/AnimatedSheet';
import DateField from '../components/DateField';
import DismissKeyboardView from '../components/DismissKeyboardView';
import { animateNext } from '../utils/animate';

export default function HomeScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [categories, setCategories] = useState(['Todas']);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagFilter, setTagFilter] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeFilterCount = (tagFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);

  // Debounce the search box so we're not firing a request per keystroke —
  // matching now happens server-side (title, categories, and field values)
  // since the client only ever has the summary list, not each score's fields.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      setError('');
      const { items: fetched } = await scoresApi.list({ search, category: filter, tag: tagFilter, dateFrom, dateTo });
      animateNext();
      setItems(fetched);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar tus puntuaciones');
    } finally {
      setLoading(false);
    }
  }, [search, filter, tagFilter, dateFrom, dateTo]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // The category/tag lists reflect ALL of the user's categories and tags,
  // not just the ones present in the current (possibly filtered) results.
  useFocusEffect(
    useCallback(() => {
      categoriesApi
        .list()
        .then(({ categories: fetched }) => setCategories(['Todas', ...fetched]))
        .catch(() => {});
      tagsApi
        .list()
        .then(({ tags: fetched }) => setAvailableTags(fetched))
        .catch(() => {});
    }, [])
  );

  const filtered = useMemo(() => {
    // Pad odd counts with an invisible spacer so the last card keeps its
    // half-width column instead of stretching across the whole row.
    return items.length % 2 === 1 ? [...items, { id: '__spacer__', spacer: true }] : items;
  }, [items]);

  const isFiltering = !!search || filter !== 'Todas' || !!tagFilter || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setTagFilter(null);
    setDateFrom(null);
    setDateTo(null);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <DismissKeyboardView style={{ flex: 1 }}>
        <View style={styles.head}>
          <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)} accessibilityLabel="Abrir menú" hitSlop={6}>
            <View style={[styles.menuBar, { backgroundColor: colors.ink }]} />
            <View style={[styles.menuBar, { backgroundColor: colors.ink }]} />
            <View style={[styles.menuBar, { backgroundColor: colors.ink, width: 12 }]} />
          </Pressable>
          <Text style={[type.screenTitle, { color: colors.ink }]}>Tus puntuaciones</Text>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={{ fontSize: 15, color: colors.sub }}>⌕</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.ink }]}
              placeholder="Buscar por título, texto, fecha, categoría o etiqueta..."
              placeholderTextColor={colors.sub}
              value={searchInput}
              onChangeText={setSearchInput}
            />
            {searchInput.length > 0 && (
              <Pressable onPress={() => setSearchInput('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
                <Text style={{ fontSize: 13, color: colors.sub, fontWeight: '700' }}>✕</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            style={[
              styles.filtersBtn,
              activeFilterCount > 0
                ? { backgroundColor: colors.accent, borderColor: colors.accent }
                : { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
            onPress={() => setFiltersOpen(true)}
            accessibilityLabel="Filtros de fecha y etiqueta"
          >
            <Text style={{ fontSize: 16 }}>⚙︎</Text>
            {activeFilterCount > 0 && (
              <View style={[styles.filtersDot, { backgroundColor: colors.white, borderColor: colors.accent }]}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.accent }}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* flexGrow: 0 keeps the chip strip at its content height — as a bare
            horizontal list it would split the leftover screen height with the
            grid below and stretch the chips vertically. alignItems: 'flex-start'
            stops the row from stretching its chips to match the tallest one
            (the default 'stretch' made every chip as tall as its container). */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {categories.map((c) => (
            <FilterChip key={c} label={c} active={filter === c} onPress={() => setFilter(c)} />
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.sub, textAlign: 'center' }}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontSize: 15, color: colors.ink, marginBottom: 4 }}>
              {isFiltering ? 'No hay notas' : 'Todavía no hay puntuaciones'}
            </Text>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: colors.sub, textAlign: 'center' }}>
              {isFiltering
                ? 'Toca el botón + para crear una.'
                : 'Toca el botón + para puntuar tu primer restaurante, peli o recuerdo.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => it.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) =>
              item.spacer ? (
                <View style={{ flex: 1 }} />
              ) : (
                <ScoreCard item={item} dark={dark} onPress={() => navigation.navigate('Detail', { scoreId: item.id })} />
              )
            }
          />
        )}

        <Pressable style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={() => navigation.navigate('Create')} accessibilityLabel="Crear puntuación">
          <Text style={[styles.fabPlus, { color: colors.white }]}>+</Text>
        </Pressable>
      </DismissKeyboardView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={(screen) => navigation.navigate(screen)} />

      <AnimatedSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <Pressable style={[styles.filtersSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[type.sheetTitle, { color: colors.ink }]}>Filtros</Text>

          <View style={styles.filterSection}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Fecha</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[type.editContext, { color: colors.sub, marginBottom: 4 }]}>Desde</Text>
                <View style={[styles.dateInputWrap, { backgroundColor: colors.bg, borderColor: colors.line }]}>
                  <DateField value={dateFrom} onChange={setDateFrom} label="Desde" />
                </View>
              </View>
              <View style={styles.dateField}>
                <Text style={[type.editContext, { color: colors.sub, marginBottom: 4 }]}>Hasta</Text>
                <View style={[styles.dateInputWrap, { backgroundColor: colors.bg, borderColor: colors.line }]}>
                  <DateField value={dateTo} onChange={setDateTo} label="Hasta" />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[type.scoreLabel, { color: colors.sub }]}>Etiquetas</Text>
            {availableTags.length === 0 ? (
              <Text style={[type.editContext, { color: colors.sub, marginTop: 6 }]}>Todavía no has usado ninguna etiqueta.</Text>
            ) : (
              <View style={styles.tagChips}>
                {availableTags.map((t) => {
                  const on = tagFilter === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setTagFilter((cur) => (cur === t ? null : t))}
                      style={[
                        styles.tagChip,
                        on
                          ? { backgroundColor: colors.accent, borderColor: colors.accent }
                          : { backgroundColor: colors.bg, borderColor: colors.line },
                      ]}
                    >
                      <Text style={[type.chip, { color: on ? colors.accentInk : colors.sub }]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.filtersActions}>
            <Pressable style={styles.clearFiltersBtn} onPress={clearFilters}>
              <Text style={[type.loginBtn, { color: colors.sub }]}>Limpiar filtros</Text>
            </Pressable>
            <Pressable style={[styles.applyFiltersBtn, { backgroundColor: colors.accent }]} onPress={() => setFiltersOpen(false)}>
              <Text style={[type.loginBtn, { color: colors.white }]}>Listo</Text>
            </Pressable>
          </View>
        </Pressable>
      </AnimatedSheet>
    </SafeAreaView>
  );
}

function ScoreCard({ item, dark, onPress }) {
  const { colors } = useTheme();
  const tint = categoryTint(item.categories?.[0], dark);
  return (
    <Pressable style={[styles.card, { backgroundColor: tint }]} onPress={onPress} accessibilityLabel={`Ver ${item.title}`}>
      {item.photoUrls?.[0] ? (
        <Image source={{ uri: item.photoUrls[0] }} style={styles.cardPhoto} />
      ) : (
        <PhotoStripe seed={hashSeed(item.id)} style={styles.cardPhoto} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[type.cardTitle, styles.cardTitleText, { color: colors.ink }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.ratings.length <= 1 ? (
            <ScoreBadge value={item.ratings[0]?.value} size={30} />
          ) : (
            <ScoreStack ratings={item.ratings} />
          )}
        </View>
        {item.categories?.length > 0 && (
          <View style={styles.cardTagRow}>
            {item.categories.map((c) => (
              <TagChip key={c} label={c} />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14 },
  menuBtn: { gap: 4, padding: 4 },
  menuBar: { width: 20, height: 2.5, borderRadius: 2 },
  searchWrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 14, padding: 0 },
  filtersBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filtersDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  chipsScroll: { flexGrow: 0 },
  chipsRow: { gap: 8, paddingHorizontal: 18, paddingBottom: 4, alignItems: 'flex-start' },
  grid: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  card: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  cardPhoto: { width: '100%', aspectRatio: 4 / 3 },
  cardBody: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 13, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cardTitleText: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 26,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabPlus: { fontSize: 26, fontWeight: '800', marginTop: -2 },
  filtersSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 18,
  },
  filterSection: { gap: 4 },
  dateRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  dateField: { flex: 1 },
  dateInputWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tagChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  filtersActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  clearFiltersBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  applyFiltersBtn: { flex: 2, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
});
