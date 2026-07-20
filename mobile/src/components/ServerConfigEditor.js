import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';
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

// Shared "point the app at a self-hosted server" editor. Used both from
// Settings (once logged in) and from the Login screen itself — a stale or
// unreachable server address otherwise leaves no way to fix it before
// logging in, since Settings previously lived only behind authentication.
export default function ServerConfigEditor({ description, onSaved }) {
  const { colors } = useTheme();
  const [currentUrl, setCurrentUrl] = useState(getApiUrl());
  const initial = parseServerUrl(currentUrl);
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  const [error, setError] = useState('');

  const isDefault = currentUrl === DEFAULT_API_URL;

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
    await saveServerUrl(url);
    setCurrentUrl(url);
    onSaved && onSaved();
  };

  const reset = async () => {
    await resetServerUrl();
    const next = parseServerUrl(DEFAULT_API_URL);
    setHost(next.host);
    setPort(next.port);
    setCurrentUrl(DEFAULT_API_URL);
    onSaved && onSaved();
  };

  return (
    <View style={{ gap: 4 }}>
      {!!description && (
        <Text style={[type.detailFieldValue, { color: colors.sub, marginTop: 2 }]}>{description}</Text>
      )}

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
  );
}

const styles = StyleSheet.create({
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
