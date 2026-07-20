import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import ServerConfigEditor from '../components/ServerConfigEditor';

export default function SettingsScreen({ navigation }) {
  const { dark, toggleDark, colors } = useTheme();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={[styles.backBtn, { backgroundColor: 'rgba(128,128,128,0.15)' }]} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <View style={[styles.backArrow, { borderColor: colors.ink }]} />
        </Pressable>
        <Text style={[type.screenTitle, { color: colors.ink }]}>Ajustes</Text>
      </View>

      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={{ flex: 1 }}>
          <Text style={[type.cardTitle, { color: colors.ink }]}>Modo oscuro</Text>
        </View>
        <Switch value={dark} onValueChange={toggleDark} trackColor={{ true: colors.accent }} />
      </View>

      <View style={[styles.serverCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[type.cardTitle, { color: colors.ink }]}>Servidor</Text>
        {/* logout() swaps the whole navigator over to the Login screen (see
            RootNavigator: it renders based on whether a user is signed in),
            so this component unmounts right after saving — there's no
            window to show a "guardado" confirmation here even if we tried. */}
        <ServerConfigEditor
          description="Dirección de tu servidor autoalojado. Al guardar se cerrará la sesión, ya que necesitarás iniciar sesión de nuevo en ese servidor."
          onSaved={logout}
        />
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  serverCard: {
    marginHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
});
