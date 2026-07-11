import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { loadServerUrlOverride } from './src/utils/serverConfig';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell({ onLayoutRootView }) {
  const { dark, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayoutRootView}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });
  // Must resolve before AuthProvider's own effect fires its first API call
  // (the session check), or that request would go out against the
  // build-time default server instead of a saved override.
  const [serverConfigReady, setServerConfigReady] = useState(false);

  useEffect(() => {
    loadServerUrlOverride().finally(() => setServerConfigReady(true));
  }, []);

  const ready = fontsLoaded && serverConfigReady;

  const onLayoutRootView = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell onLayoutRootView={onLayoutRootView} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
