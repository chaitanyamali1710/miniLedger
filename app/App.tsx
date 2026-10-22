import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddLoanScreen } from './src/screens/AddLoanScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';
import { tokenStore } from './src/tokenStore';

// Three screens, so a simple state switch is enough instead of a navigation library.
export default function App() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [screen, setScreen] = useState<'home' | 'add'>('home');

  // Stay logged in between app launches.
  useEffect(() => {
    tokenStore
      .get()
      .then((t) => setToken(t))
      .catch(() => setToken(null));
  }, []);

  const login = useCallback((t: string) => {
    tokenStore.set(t).catch(() => {});
    setToken(t);
    setScreen('home');
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear().catch(() => {});
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
