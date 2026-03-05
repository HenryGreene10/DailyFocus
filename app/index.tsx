import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';

const LAST_COMPLETED_KEY = 'dailyfocus_last_completion_date_v1';
const LAST_OUTCOME_TODAY_KEY = 'dailyfocus_last_outcome_today_v1';
const LAST_OUTCOME_DATE_KEY = 'dailyfocus_last_outcome_date_v1';

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

function getTodayDateKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const todayDateKey = getTodayDateKey();
      const lastOutcomeDateRaw = await AsyncStorage.getItem(LAST_OUTCOME_DATE_KEY);
      const lastOutcomeToday = await AsyncStorage.getItem(LAST_OUTCOME_TODAY_KEY);
      const lastCompletionRaw = await AsyncStorage.getItem(LAST_COMPLETED_KEY);
      const completionToday = normalizeStoredDateKey(lastCompletionRaw ?? '') === todayDateKey;
      const hasOutcomeToday =
        normalizeStoredDateKey(lastOutcomeDateRaw ?? '') === todayDateKey &&
        (lastOutcomeToday === 'completed' || lastOutcomeToday === 'failed');

      if (completionToday || hasOutcomeToday) {
        router.replace(
          `/achievement?outcome=${
            hasOutcomeToday ? lastOutcomeToday : 'completed'
          }` as never,
        );
        return;
      }

      router.replace('/onboarding' as never);
    })();
  }, [router]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
});
