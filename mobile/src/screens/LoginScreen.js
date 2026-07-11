import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { type } from '../theme/typography';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const submit = async () => {
    setError('');
    if (!email || !password) {
      setError('Introduce tu email y contraseña');
      return;
    }
    if (isRegister && password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      if (isRegister) {
        const name = email.split('@')[0];
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (e) {
      setError(e.message || 'Algo ha ido mal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={[styles.logo, { backgroundColor: colors.accent }]}>
            <Text style={[type.logoLetter, { color: colors.white }]}>P</Text>
          </View>

          <View>
            <Text style={[type.loginTitle, { color: colors.ink }]}>
              {isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </Text>
            <Text style={[type.loginSub, { color: colors.sub, marginTop: 2 }]}>
              {isRegister ? 'Empieza a puntuar lo que quieras' : 'Accede para ver tus puntuaciones'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[type.loginLabel, { color: colors.sub }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
              placeholder="tucorreo@email.com"
              placeholderTextColor={colors.sub}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={[type.loginLabel, { color: colors.sub }]}>Contraseña</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
              placeholder="••••••••"
              placeholderTextColor={colors.sub}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {isRegister && (
            <View style={styles.field}>
              <Text style={[type.loginLabel, { color: colors.sub }]}>Confirmar contraseña</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]}
                placeholder="••••••••"
                placeholderTextColor={colors.sub}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.btn, { backgroundColor: colors.accent }]} onPress={submit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[type.loginBtn, { color: colors.white }]}>
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </Text>
            )}
          </Pressable>

          <Text style={[type.loginSwitch, styles.switchText, { color: colors.sub }]}>
            {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <Text
              style={{ fontFamily: 'Poppins_800ExtraBold', color: colors.accent }}
              onPress={() => setMode(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, gap: 20, paddingVertical: 40 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { gap: 6 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    borderWidth: 1,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: { textAlign: 'center' },
  error: { fontFamily: 'Poppins_700Bold', fontSize: 12.5, color: '#c0392b', textAlign: 'center' },
});
