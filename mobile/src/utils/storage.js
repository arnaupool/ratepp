import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store has no web implementation; fall back to localStorage
// there so the app also runs as a web build.
export const storage = Platform.OS === 'web'
  ? {
      getItemAsync: async (k) => window.localStorage.getItem(k),
      setItemAsync: async (k, v) => window.localStorage.setItem(k, v),
      deleteItemAsync: async (k) => window.localStorage.removeItem(k),
    }
  : SecureStore;
