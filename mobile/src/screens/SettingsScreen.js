import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, saveServerUrl, resetServerUrl, DEFAULT_API_URL } from '../utils/serverConfig';

// Splits "http://host:port" into its pieces for the two-field editor below;
// falls back to blank fields if the current value isn't in that shape.
function parseServerUrl(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port || (u.protocol === 'https:' ? '443' : '80') };
  } catch {
    return { host: '', port: '' };
  }
}

export default function SettingsScreen({ navigation }) {
  const { dark, toggleDark, colors } = useTheme();
  const { logout } = useAuth();
  const initial = parseServerUrl(getApiUrl());
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  const [error, setError] = useState('');

  const isDefault = getApiUrl() === DEFAULT_API_URL;

  const applyServer = async (url) => {
    // Pointing at a different server means the current session's token
    // (issued by the old one) is meaningless there — logging out avoids
    // confusing "logged in but nothing loads" errors against the new one.
    await saveServerUrl(url);
    await logout();
  };

  const save = async () => {
    setError('');
    const trimmedHost = host.trim();
    const trimmedPort = port.trim();
    if (!trimmedHost) {
      setError('Indica la dirección del servidor');
      return;
    }
    if (trimmedPort && !/^\d{1,5}$/.test(trimmedPort)) {
      setError('El puerto debe ser un número');
      return;
    }
    const url = `http://${trimmedHost}${trimmedPort ? `:${trimmedPort}` : ''}`;
    // logout() immediately swaps the whole navigator over to the Login
    // screen (see RootNavigator: it renders based on whether a user is
    // signed in), so this component unmounts right after — there's no
    // window to show a "saved" confirmation message here even if we tried.
    await applyServer(url);
  };

  const reset = async () => {
    await resetServerUrl();
    await logout();
  };

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
        <Text style={[type.detailFieldValue, { color: colors.sub, marginTop: 2 }]}>
          Dirección de tu servidor autoalojado. Al guardar se cerrará la sesión, ya que necesitarás iniciar sesión de nuevo en ese servidor.
        </Text>

        <View style={styles.serverFields}>
          <View style={{ flex: 2 }}>
            <Text style={[type.loginLabel, { color: colors.sub }]}>IP o dominio</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.line, color: colors.ink }]}
              placeholder="192.168.1.50"
              placeholderTextColor={colors.sub}
              autoCapitalize="none"
              autoCorrect={false}
              value={host}
              onChangeText={setHost}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.loginLabel, { color: colors.sub }]}>Puerto</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.line, color: colors.ink }]}
              placeholder="4000"
              placeholderTextColor={colors.sub}
              keyboardType="number-pad"
              value={port}
              onChangeText={setPort}
            />
          </View>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.serverActions}>
          {!isDefault && (
            <Pressable style={styles.resetBtn} onPress={reset}>
              <Text style={[type.loginBtn, { color: colors.sub }]}>Restablecer</Text>
            </Pressable>
          )}
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={save}>
            <Text style={[type.loginBtn, { color: colors.white }]}>Guardar</Text>
          </Pressable>
        </View>
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
  serverFields: { flexDirection: 'row', gap: 10, marginTop: 10 },
  input: {
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  error: { fontFamily: 'Poppins_700Bold', fontSize: 12.5, color: '#c0392b', marginTop: 8 },
  serverActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  resetBtn: { paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
});
