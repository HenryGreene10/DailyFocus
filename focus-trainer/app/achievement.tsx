import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { stage1Stories } from '@/constants/stories';
import { theme } from '@/constants/theme';

const STORY_STATS_KEY = 'dailyfocus_stats_v1';
const LAST_COMPLETED_KEY = 'dailyfocus_last_completion_date_v1';
const LAST_COMPLETED_STORY_ID_KEY = 'dailyfocus_last_completed_story_id_v1';
const LAST_OUTCOME_TODAY_KEY = 'dailyfocus_last_outcome_today_v1';
const LAST_OUTCOME_DATE_KEY = 'dailyfocus_last_outcome_date_v1';

type FocusStats = {
  storiesCompleted: number;
  minutesFocused: number;
  xp: number;
  level: number;
  lastCompletedDate: string;
  dayStreak: number;
};

type SessionOutcome = 'completed' | 'failed';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function sanitizeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

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

export default function AchievementScreen() {
  const router = useRouter();
  const { outcome } = useLocalSearchParams<{ outcome?: SessionOutcome }>();
  const [resolvedOutcome, setResolvedOutcome] = useState<SessionOutcome>('completed');
  const [storyCompleteTitle, setStoryCompleteTitle] = useState<string | null>(null);
  const [storyCompleteNote, setStoryCompleteNote] = useState<string | null>(null);
  const [stats, setStats] = useState<FocusStats>({
    storiesCompleted: 0,
    minutesFocused: 0,
    xp: 0,
    level: 1,
    lastCompletedDate: '',
    dayStreak: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function hydrateStats() {
      const raw = await AsyncStorage.getItem(STORY_STATS_KEY);
      if (!raw || !isMounted) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<FocusStats>;
        setStats({
          storiesCompleted: sanitizeNumber(parsed.storiesCompleted, 0),
          minutesFocused: sanitizeNumber(parsed.minutesFocused, 0),
          xp: sanitizeNumber(parsed.xp, 0),
          level: sanitizeNumber(parsed.level, 1),
          lastCompletedDate:
            typeof parsed.lastCompletedDate === 'string' ? parsed.lastCompletedDate : '',
          dayStreak: sanitizeNumber(parsed.dayStreak, 0),
        });
      } catch {
        // Keep defaults on invalid storage payload.
      }
    }

    async function hydrateOutcome() {
      if (!isMounted) {
        return;
      }

      if (outcome === 'completed' || outcome === 'failed') {
        setResolvedOutcome(outcome);
        return;
      }

      const [storedOutcome, storedOutcomeDateRaw] = await Promise.all([
        AsyncStorage.getItem(LAST_OUTCOME_TODAY_KEY),
        AsyncStorage.getItem(LAST_OUTCOME_DATE_KEY),
      ]);

      const hasOutcomeToday =
        normalizeStoredDateKey(storedOutcomeDateRaw ?? '') === getTodayDateKey() &&
        (storedOutcome === 'completed' || storedOutcome === 'failed');

      if (hasOutcomeToday) {
        setResolvedOutcome(storedOutcome as SessionOutcome);
      }
    }

    async function hydrateStoryReflection() {
      const lastCompletedStoryId = await AsyncStorage.getItem(LAST_COMPLETED_STORY_ID_KEY);
      if (!lastCompletedStoryId || !isMounted) {
        return;
      }

      const story = stage1Stories.find((entry) => entry.id === lastCompletedStoryId);
      if (!story) {
        return;
      }

      setStoryCompleteTitle(story.completeTitle ?? null);
      setStoryCompleteNote(story.completeNote ?? null);
    }

    void hydrateStats();
    void hydrateOutcome();
    void hydrateStoryReflection();

    return () => {
      isMounted = false;
    };
  }, [outcome]);

  const storiesCompleted = String(stats.storiesCompleted);
  const minutesFocused = String(Math.round(stats.minutesFocused));
  const dayStreak = String(stats.dayStreak);
  const level = String(stats.level);
  const failed = resolvedOutcome === 'failed';
  const completionTitle = failed ? 'Stay with it tomorrow.' : storyCompleteTitle ?? 'Focus Deepens';

  return (
    <Pressable
      delayLongPress={2000}
      onLongPress={
        __DEV__
          ? () => {
              void (async () => {
                await AsyncStorage.multiRemove([
                  LAST_COMPLETED_KEY,
                  LAST_OUTCOME_TODAY_KEY,
                  LAST_OUTCOME_DATE_KEY,
                ]);
                router.replace('/' as never);
              })();
            }
          : undefined
      }
      style={styles.container}>
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />

      <View style={styles.content}>
        <Text style={styles.label}>{failed ? 'Session Ended' : 'Daily Story Complete'}</Text>
        <Text style={styles.title}>{completionTitle}</Text>
        {!failed && storyCompleteNote ? (
          <Text style={styles.completeNote}>{storyCompleteNote}</Text>
        ) : null}
        <Text style={styles.subtitle}>
          {"You've reached Level "}
          {level}
        </Text>

        <View style={styles.statsRow}>
          <Stat label="Stories" value={storiesCompleted} />
          <View style={styles.divider} />
          <Stat label="Minutes" value={minutesFocused} />
          <View style={styles.divider} />
          <Stat label="Streak" value={dayStreak} />
        </View>

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
  content: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  label: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.small,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.cormorantLight,
    fontSize: theme.fontSizes.title,
    fontWeight: '300',
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraItalic,
    fontSize: theme.fontSizes.bodyLarge,
    marginTop: theme.spacing.xs,
  },
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: theme.spacing.xxl,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 90,
  },
  statValue: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.cormorantLight,
    fontSize: 34,
    fontWeight: '300',
    opacity: 0.78,
  },
  statLabel: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.tiny,
    letterSpacing: 2,
    marginTop: theme.spacing.xs,
    opacity: 0.72,
    textTransform: 'uppercase',
  },
  divider: {
    backgroundColor: theme.colors.accent,
    height: 70,
    marginHorizontal: theme.spacing.sm,
    opacity: 0.12,
    width: 1,
  },
  completeNote: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    marginTop: theme.spacing.sm,
    opacity: 0.7,
    textAlign: 'center',
  },
  corner: {
    borderColor: theme.colors.accent,
    height: 40,
    opacity: 0.2,
    position: 'absolute',
    width: 40,
  },
  cornerTopLeft: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    left: 50,
    top: 50,
  },
  cornerTopRight: {
    borderRightWidth: 1,
    borderTopWidth: 1,
    right: 50,
    top: 50,
  },
  cornerBottomLeft: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    bottom: 50,
    left: 50,
  },
  cornerBottomRight: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    bottom: 50,
    right: 50,
  },
});
