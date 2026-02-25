import AsyncStorage from '@react-native-async-storage/async-storage';
import { CormorantGaramond_300Light, CormorantGaramond_400Regular_Italic } from '@expo-google-fonts/cormorant-garamond';
import { Lora_400Regular, Lora_400Regular_Italic } from '@expo-google-fonts/lora';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

const LAST_COMPLETED_KEY = 'dailyfocus_last_completion_date_v1';
const TONIGHT_REMINDER_ID_KEY = 'dailyfocus_tonight_reminder_notification_id_v1';
const REMINDER_NOTIFICATION_TYPE = 'daily_reminder';

function getTodayDateKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeStoredDateKey(raw: string): string | null {
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTonightReminderTriggerDate(): Date {
  if (__DEV__) {
    return new Date(Date.now() + 2 * 60 * 1000);
  }

  const now = new Date();
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);

  if (tonight <= now) {
    tonight.setDate(tonight.getDate() + 1);
  }

  return tonight;
}

async function syncTonightReminder(): Promise<void> {
  const scheduledId = await AsyncStorage.getItem(TONIGHT_REMINDER_ID_KEY);
  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.status !== 'granted') {
    if (scheduledId) {
      await Notifications.cancelScheduledNotificationAsync(scheduledId);
      await AsyncStorage.removeItem(TONIGHT_REMINDER_ID_KEY);
    }
    return;
  }

  const lastCompletedRaw = await AsyncStorage.getItem(LAST_COMPLETED_KEY);
  const completedToday = normalizeStoredDateKey(lastCompletedRaw ?? '') === getTodayDateKey();

  if (completedToday) {
    if (scheduledId) {
      await Notifications.cancelScheduledNotificationAsync(scheduledId);
      await AsyncStorage.removeItem(TONIGHT_REMINDER_ID_KEY);
    }
    return;
  }

  if (scheduledId) {
    await Notifications.cancelScheduledNotificationAsync(scheduledId);
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'DailyFocus',
      body: `Don’t forget to practice your focus today.
“Concentration is the secret of strength.” — Ralph Waldo Emerson`,
      data: { type: REMINDER_NOTIFICATION_TYPE },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: getTonightReminderTriggerDate(),
    },
  });

  await AsyncStorage.setItem(TONIGHT_REMINDER_ID_KEY, identifier);
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
    const completedToday = normalizeStoredDateKey(lastCompletedRaw ?? '') === getTodayDateKey();

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

  useEffect(() => {
    void syncTonightReminder();
  }, []);

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
