import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddLoanScreen } from './src/screens/AddLoanScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

const TOKEN_KEY = 'miniledger-token';

// Three screens, so a simple state switch is enough instead of a navigation library.
export default function App() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [screen, setScreen] = useState<'home' | 'add'>('home');

  // Stay logged in between app launches.
  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((t) => setToken(t))
      .catch(() => setToken(null));
  }, []);

  const login = useCallback((t: string) => {
    SecureStore.setItemAsync(TOKEN_KEY, t).catch(() => {});
    setToken(t);
    setScreen('home');
  }, []);

  const logout = useCallback(() => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
  }, []);

  let content;
  if (token === undefined) {
    content = (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  } else if (token === null) {
    content = <LoginScreen onLoggedIn={login} />;
  } else if (screen === 'add') {
    content = <AddLoanScreen token={token} onDone={() => setScreen('home')} onCancel={() => setScreen('home')} />;
  } else {
    content = <HomeScreen token={token} onAdd={() => setScreen('add')} onLogout={logout} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {content}
    </SafeAreaProvider>
  );
}
