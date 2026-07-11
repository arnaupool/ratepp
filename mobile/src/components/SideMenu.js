import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';

const PANEL_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

export default function SideMenu({ visible, onClose, onNavigate }) {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateX.setValue(-PANEL_WIDTH);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -PANEL_WIDTH, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const go = (screen) => {
    onClose();
    onNavigate(screen);
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          { width: PANEL_WIDTH, backgroundColor: colors.surface, paddingTop: insets.top + 20, transform: [{ translateX }] },
        ]}
      >
        <Text style={[type.detailTitle, { color: colors.ink }]} numberOfLines={1}>
          {user?.name || 'Puntuaciones'}
        </Text>
        {!!user?.email && (
          <Text style={[type.editContext, { color: colors.sub, marginTop: 2 }]} numberOfLines={1}>
            {user.email}
          </Text>
        )}

        <View style={styles.items}>
          <Pressable style={styles.item} onPress={() => go('LocationsMap')}>
            <Text style={[type.cardTitle, { color: colors.ink }]}>🗺️  Mapa de ubicaciones</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={() => go('ManageLabels')}>
            <Text style={[type.cardTitle, { color: colors.ink }]}>🏷️  Categorías y etiquetas</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={() => go('Settings')}>
            <Text style={[type.cardTitle, { color: colors.ink }]}>⚙️  Ajustes</Text>
          </Pressable>
          <Pressable
            style={styles.item}
            onPress={() => {
              onClose();
              logout();
            }}
          >
            <Text style={[type.cardTitle, { color: colors.sub }]}>↩️  Cerrar sesión</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 60 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, paddingHorizontal: 20 },
  items: { marginTop: 26, gap: 4 },
  item: { paddingVertical: 13 },
});
