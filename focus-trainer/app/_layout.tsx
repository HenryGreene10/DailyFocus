import { CormorantGaramond_300Light, CormorantGaramond_400Regular_Italic } from '@expo-google-fonts/cormorant-garamond';
import { Lora_400Regular, Lora_400Regular_Italic } from '@expo-google-fonts/lora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_400Regular_Italic,
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular_Italic,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="story" />
        <Stack.Screen name="achievement" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
