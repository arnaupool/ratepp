import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { categoriesApi } from '../api/categories';
import { tagsApi } from '../api/tags';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import ConfirmDialog from '../components/ConfirmDialog';
import { animateNext } from '../utils/animate';

export default function ManageLabelsScreen({ navigation }) {
  const { colors } = useTheme();
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null); // { kind: 'category'|'tag', name }

  const load = useCallback(async () => {
    try {
      setError('');
      const [cats, tgs] = await Promise.all([categoriesApi.list(), tagsApi.list()]);
      setCategories(cats.categories);
      setTags(tgs.tags);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las categorías y etiquetas');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { kind, name } = pendingDelete;
    setPendingDelete(null);
    animateNext();
    if (kind === 'category') {
      setCategories((prev) => prev.filter((c) => c !== name));
    } else {
      setTags((prev) => prev.filter((t) => t !== name));
    }
    try {
      if (kind === 'category') await categoriesApi.remove(name);
      else await tagsApi.remove(name);
    } catch (e) {
      setError(e.message || 'No se pudo eliminar');
      load();
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={[styles.backBtn, { backgroundColor: 'rgba(128,128,128,0.15)' }]} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <View style={[styles.backArrow, { borderColor: colors.ink }]} />
        </Pressable>
        <Text style={[type.screenTitle, { color: colors.ink }]}>Categorías y etiquetas</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 30 }} />
      ) : (
        <View style={styles.body}>
          {!!error && <Text style={[type.detailFieldValue, { color: '#c0392b' }]}>{error}</Text>}

          <Text style={[type.scoreLabel, { color: colors.sub }]}>Categorías</Text>
          <View style={styles.list}>
            {categories.length === 0 && (
              <Text style={[type.detailFieldValue, { color: colors.sub }]}>No tienes categorías todavía.</Text>
            )}
            {categories.map((c) => (
              <View key={c} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Text style={[type.detailFieldValue, { color: colors.ink, flex: 1 }]}>{c}</Text>
                <Pressable
                  onPress={() => setPendingDelete({ kind: 'category', name: c })}
                  accessibilityLabel={`Eliminar categoría ${c}`}
                  hitSlop={6}
                >
                  <Text style={{ fontSize: 16 }}>🗑</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Text style={[type.scoreLabel, { color: colors.sub, marginTop: 20 }]}>Etiquetas</Text>
          <View style={styles.list}>
            {tags.length === 0 && (
              <Text style={[type.detailFieldValue, { color: colors.sub }]}>No tienes etiquetas todavía.</Text>
            )}
            {tags.map((t) => (
              <View key={t} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Text style={[type.detailFieldValue, { color: colors.ink, flex: 1 }]}>{t}</Text>
                <Pressable
                  onPress={() => setPendingDelete({ kind: 'tag', name: t })}
                  accessibilityLabel={`Eliminar etiqueta ${t}`}
                  hitSlop={6}
                >
                  <Text style={{ fontSize: 16 }}>🗑</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={!!pendingDelete}
        title={`¿Eliminar "${pendingDelete?.name}"?`}
        message="Se quitará de todas las puntuaciones que la usan. No se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 8,
    height: 8,
    marginLeft: 3,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: '45deg' }],
  },
  body: { paddingHorizontal: 18, gap: 8 },
  list: { gap: 8, marginTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
