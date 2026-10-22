import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Phones keep the login token in secure storage. Browsers have no secure
// storage, so the web version uses localStorage instead.
const KEY = 'miniledger-token';
const web = Platform.OS === 'web';

export const tokenStore = {
  get: async () => (web ? localStorage.getItem(KEY) : SecureStore.getItemAsync(KEY)),
  set: async (token: string) => (web ? localStorage.setItem(KEY, token) : SecureStore.setItemAsync(KEY, token)),
  clear: async () => (web ? localStorage.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};
