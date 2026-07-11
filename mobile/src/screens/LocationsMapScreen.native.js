import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scoresApi } from '../api/scores';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import ScoreBadge from '../components/ScoreBadge';

const DEFAULT_REGION = { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 8, longitudeDelta: 8 };

export default function LocationsMapScreen({ navigation }) {
  const { colors } = useTheme();
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    scoresApi
      .locations()
      .then(({ locations: fetched }) => {
        setLocations(fetched);
        if (fetched.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(
              fetched.map((l) => ({ latitude: l.lat, longitude: l.lng })),
              { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: false }
            );
          }, 100);
        }
      })
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
        <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={DEFAULT_REGION}>
          {locations.map((loc, idx) => (
            <Marker key={`${loc.scoreId}-${idx}`} coordinate={{ latitude: loc.lat, longitude: loc.lng }}>
              {/* tapping the pin opens this callout (native default); tapping
                  the callout itself is what actually navigates to Detail */}
              <Callout tooltip onPress={() => navigation.navigate('Detail', { scoreId: loc.scoreId })}>
                <View style={[styles.callout, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  {loc.coverUrl ? (
                    <Image source={{ uri: loc.coverUrl }} style={[styles.calloutPhoto, { backgroundColor: colors.bg }]} />
                  ) : (
                    <View style={[styles.calloutPhoto, styles.calloutPhotoPlaceholder, { backgroundColor: colors.bg }]}>
                      <Text style={{ fontSize: 18 }}>📍</Text>
                    </View>
                  )}
                  <View style={styles.calloutBody}>
                    <Text style={[type.cardTitle, { color: colors.ink }]} numberOfLines={2}>{loc.title}</Text>
                    {!!loc.label && (
                      <Text style={[type.editContext, { color: colors.sub, marginTop: 1 }]} numberOfLines={1}>{loc.label}</Text>
                    )}
                  </View>
                  {loc.avgScore != null && <ScoreBadge value={loc.avgScore} size={32} />}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
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
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  calloutPhoto: { width: 44, height: 44, borderRadius: 10 },
  calloutPhotoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  calloutBody: { flex: 1 },
});
