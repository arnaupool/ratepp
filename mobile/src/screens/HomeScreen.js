import React, { useCallback, useMemo, useState } from 'react';
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
import { categoryTint, hashSeed } from '../theme/palettes';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import PhotoStripe from '../components/PhotoStripe';
import ScoreBadge from '../components/ScoreBadge';
import ScoreStack from '../components/ScoreStack';
import TagChip from '../components/TagChip';
import FilterChip from '../components/FilterChip';
import SideMenu from '../components/SideMenu';
import { animateNext } from '../utils/animate';

export default function HomeScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const { items: fetched } = await scoresApi.list();
      animateNext();
      setItems(fetched);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar tus puntuaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((it) => (it.categories || []).forEach((c) => set.add(c)));
    return ['Todas', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const visible = items
      .filter((it) => filter === 'Todas' || (it.categories || []).includes(filter))
      .filter((it) => it.title.toLowerCase().includes(search.toLowerCase()));
    // Pad odd counts with an invisible spacer so the last card keeps its
    // half-width column instead of stretching across the whole row.
    return visible.length % 2 === 1 ? [...visible, { id: '__spacer__', spacer: true }] : visible;
  }, [items, filter, search]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
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
            placeholder="Buscar por título..."
            placeholderTextColor={colors.sub}
            value={search}
            onChangeText={setSearch}
          />
        </View>
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
            Todavía no hay puntuaciones
          </Text>
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: colors.sub, textAlign: 'center' }}>
            Toca el botón + para puntuar tu primer restaurante, peli o recuerdo.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={styles.grid}
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

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={(screen) => navigation.navigate(screen)} />
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
  searchWrap: { paddingHorizontal: 18, paddingBottom: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 14, padding: 0 },
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
});
