import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scoresApi } from '../api/scores';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import ScoreBadge from '../components/ScoreBadge';

// react-native-maps has no web target; the web build (local dev preview /
// e2e suite) falls back to a plain tappable list instead of pins on a map.
export default function LocationsMapScreen({ navigation }) {
  const { colors } = useTheme();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    scoresApi
      .locations()
      .then(({ locations: fetched }) => setLocations(fetched))
      .catch((e) => setError(e.message || 'No se pudieron cargar las ubicaciones'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={[styles.backBtn, { backgroundColor: 'rgba(128,128,128,0.15)' }]} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <View style={[styles.backArrow, { borderColor: colors.ink }]} />
        </Pressable>
        <Text style={[type.screenTitle, { color: colors.ink }]}>Mapa de ubicaciones</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 30 }} />
      ) : error ? (
        <Text style={[type.detailFieldValue, { color: colors.sub, textAlign: 'center', marginTop: 20 }]}>{error}</Text>
      ) : locations.length === 0 ? (
        <Text style={[type.detailFieldValue, { color: colors.sub, textAlign: 'center', marginTop: 20, paddingHorizontal: 30 }]}>
          Todavía no has guardado ninguna ubicación en tus puntuaciones.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {locations.map((loc, idx) => (
            <Pressable
              key={`${loc.scoreId}-${idx}`}
              style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.line }]}
              onPress={() => navigation.navigate('Detail', { scoreId: loc.scoreId })}
            >
              {loc.coverUrl ? (
                <Image source={{ uri: loc.coverUrl }} style={[styles.thumb, { backgroundColor: colors.bg }]} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.bg }]}>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[type.detailFieldValue, { color: colors.ink }]} numberOfLines={1}>{loc.title}</Text>
                {!!loc.label && (
                  <Text style={[type.editContext, { color: colors.sub, marginTop: 2 }]} numberOfLines={1}>{loc.label}</Text>
                )}
              </View>
              {loc.avgScore != null && <ScoreBadge value={loc.avgScore} size={32} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  list: { paddingHorizontal: 18, gap: 8, paddingBottom: 30 },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
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
