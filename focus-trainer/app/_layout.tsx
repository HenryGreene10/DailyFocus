import AsyncStorage from '@react-native-async-storage/async-storage';
import { CormorantGaramond_300Light, CormorantGaramond_400Regular_Italic } from '@expo-google-fonts/cormorant-garamond';
import { Lora_400Regular, Lora_400Regular_Italic } from '@expo-google-fonts/lora';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

const LAST_COMPLETED_KEY = 'dailyfocus_last_completion_date_v1';
const REMINDER_NOTIFICATION_TYPE = 'daily_reminder';

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;

    if (type !== REMINDER_NOTIFICATION_TYPE) {
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    const lastCompletedRaw = await AsyncStorage.getItem(LAST_COMPLETED_KEY);
    const lastCompleted = lastCompletedRaw ? new Date(lastCompletedRaw) : null;
    const completedToday = !!lastCompleted && !Number.isNaN(lastCompleted.getTime()) && isSameLocalDate(lastCompleted, new Date());

    return {
      shouldShowBanner: !completedToday,
      shouldShowList: !completedToday,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

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
      <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="story" />
        <Stack.Screen name="achievement" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
