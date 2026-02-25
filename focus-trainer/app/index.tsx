import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

let hasShownLaunchOnboarding = false;
const LAST_COMPLETED_KEY = 'dailyfocus_last_completion_date_v1';
const LAST_OUTCOME_TODAY_KEY = 'dailyfocus_last_outcome_today_v1';
const LAST_OUTCOME_DATE_KEY = 'dailyfocus_last_outcome_date_v1';

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

const CORNERS = [
  { key: 'tl', style: { top: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'tr', style: { top: theme.spacing.xl, right: theme.spacing.xl } },
  { key: 'bl', style: { bottom: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'br', style: { bottom: theme.spacing.xl, right: theme.spacing.xl } },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const [showHome, setShowHome] = useState(hasShownLaunchOnboarding);

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

      if (!hasShownLaunchOnboarding) {
        hasShownLaunchOnboarding = true;
        router.replace('/onboarding' as never);
        return;
      }

      setShowHome(true);
    })();
  }, [router]);

  if (!showHome) {
    return <View style={styles.container} />;
  }

  return (
    <Pressable
      onPress={() => {
        void (async () => {
          const completionToday =
            normalizeStoredDateKey((await AsyncStorage.getItem(LAST_COMPLETED_KEY)) ?? '') ===
            getTodayDateKey();

          if (completionToday) {
            router.replace('/achievement?outcome=completed' as never);
            return;
          }

          router.push('/story' as never);
        })();
      }}
      style={styles.container}>
      {CORNERS.map((corner) => (
        <Text key={corner.key} style={[styles.cornerStar, corner.style]}>
          ✦
        </Text>
      ))}

      <View style={styles.centerContent}>
        <Text style={styles.title}>DailyFocus</Text>
        <Text style={styles.subtitle}>tap to begin your practice</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.cormorantLight,
    fontSize: theme.fontSizes.hero,
    fontWeight: '300',
    letterSpacing: 2,
  },
  subtitle: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    letterSpacing: 3,
    marginTop: theme.spacing.xs,
  },
  cornerStar: {
    color: theme.colors.accentLight,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.bodyLarge,
    opacity: 0.3,
    position: 'absolute',
  },
});
