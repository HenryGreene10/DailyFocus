import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ProgressStoreProvider } from '@/src/state/useProgressStore';

export default function RootLayout() {
  return (
    <ProgressStoreProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="session" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ProgressStoreProvider>
  );
}
