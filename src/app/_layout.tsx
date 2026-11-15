import '../i18n'; // init i18n
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getDatabase } from '../db/database';
import { seedDemoData } from '../db/seedData';
import { Colors } from '../constants/theme';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.accent,
    background: Colors.background,
    surface: Colors.surface,
  },
};

export default function RootLayout() {
  useEffect(() => {
    getDatabase()
      .then(async (db) => {
        try {
          const partyCount = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM parties;'
          );
          if (!partyCount || partyCount.count === 0) {
            console.log('[INIT] Database is empty, seeding complete demo data...');
            await seedDemoData();
          }
        } catch (e) {
          console.error('[INIT] Error checking/seeding database:', e);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="trip/create" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="party/create" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="party/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="invoice/create" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="invoice/[id]" options={{ headerShown: false }} />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
