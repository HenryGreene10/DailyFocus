import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { storyData } from '@/constants/storyData';
import { theme } from '@/constants/theme';

const STORY_STATS_KEY = 'dailyfocus_stats_v1';
const LAST_COMPLETED_KEY = 'dailyfocus_last_completion_date_v1';
const TONIGHT_REMINDER_ID_KEY = 'dailyfocus_tonight_reminder_notification_id_v1';
const REMINDER_NOTIFICATION_TYPE = 'daily_reminder';
const PASSAGE_MIN_MS = 2000;
const PASSAGE_FADE_MS = Platform.OS === 'ios' ? 980 : 820;

type FocusStats = {
  storiesCompleted: number;
  minutesFocused: number;
  xp: number;
  level: number;
  lastCompletedDate: string;
  dayStreak: number;
};

const defaultStats: FocusStats = {
  storiesCompleted: 0,
  minutesFocused: 0,
  xp: 0,
  level: 1,
  lastCompletedDate: '',
  dayStreak: 0,
};

function sanitizeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDayDifference(previousDateIso: string, now: Date): number | null {
  if (!previousDateIso) {
    return null;
  }

  const previousDate = new Date(previousDateIso);
  if (Number.isNaN(previousDate.getTime())) {
    return null;
  }

  const diffMs = startOfDay(now).getTime() - startOfDay(previousDate).getTime();
  return Math.floor(diffMs / 86400000);
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
  const lastCompleted = lastCompletedRaw ? new Date(lastCompletedRaw) : null;
  const completedToday =
    !!lastCompleted &&
    !Number.isNaN(lastCompleted.getTime()) &&
    isSameLocalDate(lastCompleted, new Date());

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
      body: `Don't forget practice your focus today, "Concentration is the secret of strength." — Ralph Waldo Emerson.`,
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

function LighthouseWatermark() {
  return (
    <Svg fill="none" height="240" viewBox="0 0 240 240" width="240">
      <Path d="M98 46H142L132 118H108L98 46Z" stroke={theme.colors.textSecondary} strokeWidth={2} />
      <Rect
        height={48}
        rx={2}
        stroke={theme.colors.textSecondary}
        strokeWidth={2}
        width={24}
        x={108}
        y={118}
      />
      <Rect
        height={10}
        stroke={theme.colors.textSecondary}
        strokeWidth={2}
        width={36}
        x={102}
        y={36}
      />
      <Circle cx={120} cy={40} r={2} fill={theme.colors.textSecondary} />
      <Path d="M56 178C70 169 84 187 98 178C112 169 126 187 140 178C154 169 168 187 182 178" stroke={theme.colors.textSecondary} strokeWidth={2} />
      <Path d="M46 192C62 183 78 201 94 192C110 183 126 201 142 192C158 183 174 201 190 192" stroke={theme.colors.textSecondary} strokeWidth={2} />
    </Svg>
  );
}

async function loadStats(): Promise<FocusStats> {
  const raw = await AsyncStorage.getItem(STORY_STATS_KEY);

  if (!raw) {
    return defaultStats;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FocusStats>;
    return {
      storiesCompleted: sanitizeNumber(parsed.storiesCompleted, 0),
      minutesFocused: sanitizeNumber(parsed.minutesFocused, 0),
      xp: sanitizeNumber(parsed.xp, 0),
      level: sanitizeNumber(parsed.level, 1),
      lastCompletedDate: typeof parsed.lastCompletedDate === 'string' ? parsed.lastCompletedDate : '',
      dayStreak: sanitizeNumber(parsed.dayStreak, 0),
    };
  } catch {
    return defaultStats;
  }
}

async function completeStory(elapsedSeconds: number): Promise<FocusStats> {
  const previous = await loadStats();
  const now = new Date();
  const dayDiff = getDayDifference(previous.lastCompletedDate, now);

  const dayStreak =
    dayDiff === null ? 1 : dayDiff === 1 ? previous.dayStreak + 1 : dayDiff === 0 ? previous.dayStreak : 1;

  const storiesCompleted = previous.storiesCompleted + 1;
  const minutesFocused = previous.minutesFocused + elapsedSeconds / 60;
  const xp = previous.xp + 100;
  const level = Math.floor(xp / 300) + 1;

  const updated: FocusStats = {
    storiesCompleted,
    minutesFocused,
    xp,
    level,
    lastCompletedDate: now.toISOString(),
    dayStreak,
  };

  await AsyncStorage.setItem(STORY_STATS_KEY, JSON.stringify(updated));
  await AsyncStorage.setItem(LAST_COMPLETED_KEY, updated.lastCompletedDate);

  return updated;
}

export default function StoryScreen() {
  const router = useRouter();
  const [passageIndex, setPassageIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const [blockedHint, setBlockedHint] = useState<{ x: number; y: number } | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const blockedHintOpacity = useRef(new Animated.Value(0)).current;
  const startedAtRef = useRef(Date.now());
  const isAnimatingRef = useRef(false);
  const sessionEndedRef = useRef(false);

  useEffect(() => {
    setCanAdvance(false);

    const timeout = setTimeout(() => {
      setCanAdvance(true);
    }, PASSAGE_MIN_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [passageIndex]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (sessionEndedRef.current) {
        return;
      }

      if (nextState === 'inactive' || nextState === 'background') {
        sessionEndedRef.current = true;
        router.replace('/achievement?outcome=failed' as never);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const showBlockedHint = (event: GestureResponderEvent) => {
    setBlockedHint({
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
    });

    blockedHintOpacity.stopAnimation();
    blockedHintOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(blockedHintOpacity, {
        toValue: 0.48,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(blockedHintOpacity, {
        toValue: 0,
        duration: 2820,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setBlockedHint(null);
    });
  };

  const handleAdvance = async (event: GestureResponderEvent) => {
    if (sessionEndedRef.current || isAnimatingRef.current) {
      return;
    }

    if (!canAdvance) {
      showBlockedHint(event);
      return;
    }

    const isLastPassage = passageIndex === storyData.passages.length - 1;

    if (isLastPassage) {
      sessionEndedRef.current = true;
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const updated = await completeStory(elapsedSeconds);

      if (updated.storiesCompleted === 1) {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      }

      await syncTonightReminder();
      router.replace('/achievement?outcome=completed' as never);
      return;
    }

    isAnimatingRef.current = true;

    Animated.timing(fade, {
      toValue: 0,
      duration: PASSAGE_FADE_MS,
      useNativeDriver: true,
    }).start(() => {
      setPassageIndex((prev) => prev + 1);
      Animated.timing(fade, {
        toValue: 1,
        duration: PASSAGE_FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
      });
    });
  };

  return (
    <Pressable onPress={handleAdvance} style={styles.container}>
      <View style={styles.metaBlock}>
        <Text style={styles.chapter}>{storyData.chapter}</Text>
        <Text style={styles.title}>{storyData.title}</Text>
      </View>

      <View style={styles.centerBlock}>
        <View pointerEvents="none" style={styles.watermark}>
          <LighthouseWatermark />
        </View>
        <Animated.Text style={[styles.passage, { opacity: fade }]}>{storyData.passages[passageIndex]}</Animated.Text>
      </View>
      {blockedHint ? (
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.blockedHint,
            {
              left: blockedHint.x - 40,
              opacity: blockedHintOpacity,
              top: blockedHint.y - 10,
            },
          ]}>
          don’t rush
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  metaBlock: {
    alignItems: 'center',
    paddingTop: 70,
  },
  chapter: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.tiny,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.cormorantItalic,
    fontSize: 15,
    marginTop: theme.spacing.xs,
  },
  centerBlock: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  watermark: {
    opacity: 0.07,
    position: 'absolute',
  },
  passage: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.loraItalic,
    fontSize: Platform.OS === 'ios' ? theme.fontSizes.story + 1 : theme.fontSizes.story,
    lineHeight: Platform.OS === 'ios' ? 34 : 32,
    paddingHorizontal: 44,
    textAlign: 'center',
  },
  blockedHint: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraItalic,
    fontSize: Platform.OS === 'ios' ? 18 : 17,
    opacity: 0,
    position: 'absolute',
  },
});
