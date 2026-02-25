import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
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

import { stage1Stories } from '@/constants/stories';
import { theme } from '@/constants/theme';

const STORY_STATS_KEY = 'dailyfocus_stats_v1';
const LAST_COMPLETED_KEY = 'dailyfocus_last_completion_date_v1';
const LAST_COMPLETED_STORY_ID_KEY = 'dailyfocus_last_completed_story_id_v1';
const LAST_OUTCOME_TODAY_KEY = 'dailyfocus_last_outcome_today_v1';
const LAST_OUTCOME_DATE_KEY = 'dailyfocus_last_outcome_date_v1';
const TONIGHT_REMINDER_ID_KEY = 'dailyfocus_tonight_reminder_notification_id_v1';
const REMINDER_NOTIFICATION_TYPE = 'daily_reminder';
const PASSAGE_FADE_MS = Platform.OS === 'ios' ? 980 : 820;
const COMPLETION_PAUSE_MS = 450;

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

type StoryEntry = (typeof stage1Stories)[number];

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

function parseDateKeyToDate(dateKey: string): Date | null {
  const parts = dateKey.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(year, monthIndex, day);
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

function getDayDifference(previousDateKeyRaw: string, nowDateKey: string): number | null {
  const previousDateKey = normalizeStoredDateKey(previousDateKeyRaw);
  if (!previousDateKey) {
    return null;
  }

  const previousDate = parseDateKeyToDate(previousDateKey);
  const nowDate = parseDateKeyToDate(nowDateKey);

  if (!previousDate || !nowDate) {
    return null;
  }

  const diffMs = nowDate.getTime() - previousDate.getTime();
  return Math.floor(diffMs / 86400000);
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
  const todayDateKey = getTodayDateKey();
  const dayDiff = getDayDifference(previous.lastCompletedDate, todayDateKey);

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
    lastCompletedDate: todayDateKey,
    dayStreak,
  };

  await AsyncStorage.setItem(STORY_STATS_KEY, JSON.stringify(updated));
  await AsyncStorage.setItem(LAST_COMPLETED_KEY, updated.lastCompletedDate);
  await AsyncStorage.setItem(LAST_OUTCOME_TODAY_KEY, 'completed');
  await AsyncStorage.setItem(LAST_OUTCOME_DATE_KEY, todayDateKey);

  return updated;
}

export default function StoryScreen() {
  const router = useRouter();
  const story: StoryEntry | undefined = stage1Stories[0];
  const [passageIndex, setPassageIndex] = useState(0);
  const [blockedHint, setBlockedHint] = useState<{ x: number; y: number } | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const blockedHintOpacity = useRef(new Animated.Value(0)).current;
  const blockedHintRunIdRef = useRef(0);
  const passageStartedAtRef = useRef(Date.now());
  const startedAtRef = useRef(Date.now());
  const isAnimatingRef = useRef(false);
  const sessionEndedRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (sessionEndedRef.current) {
        return;
      }

      if (nextState === 'inactive' || nextState === 'background') {
        sessionEndedRef.current = true;
        const todayDateKey = getTodayDateKey();
        void (async () => {
          await AsyncStorage.setItem(LAST_OUTCOME_TODAY_KEY, 'failed');
          await AsyncStorage.setItem(LAST_OUTCOME_DATE_KEY, todayDateKey);
          router.replace('/achievement?outcome=failed' as never);
        })();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    void (async () => {
      if (!story) {
        return;
      }

      const completedRaw = await AsyncStorage.getItem(LAST_COMPLETED_KEY);
      if (normalizeStoredDateKey(completedRaw ?? '') === getTodayDateKey()) {
        sessionEndedRef.current = true;
        router.replace('/achievement?outcome=completed' as never);
      }
    })();
  }, [router, story]);

  const showBlockedHint = (event: GestureResponderEvent) => {
    setBlockedHint({
      x: event.nativeEvent.locationX,
      y: event.nativeEvent.locationY,
    });

    blockedHintRunIdRef.current += 1;
    const runId = blockedHintRunIdRef.current;
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
      if (blockedHintRunIdRef.current === runId) {
        setBlockedHint(null);
      }
    });
  };

  const handleAdvance = async (event: GestureResponderEvent) => {
    if (sessionEndedRef.current) {
      return;
    }

    if (!story) {
      return;
    }

    const elapsedSincePassageShownMs = Date.now() - passageStartedAtRef.current;
    if (elapsedSincePassageShownMs < story.minDisplayMs) {
      showBlockedHint(event);
      return;
    }

    if (isAnimatingRef.current) {
      return;
    }

    const isLastPassage = passageIndex === story.passages.length - 1;

    if (isLastPassage) {
      sessionEndedRef.current = true;
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const updated = await completeStory(elapsedSeconds);
      await AsyncStorage.setItem(LAST_COMPLETED_STORY_ID_KEY, story.id);

      if (updated.storiesCompleted === 1) {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      }

      await syncTonightReminder();
      await Haptics.selectionAsync();
      await new Promise<void>((resolve) => {
        setTimeout(resolve, COMPLETION_PAUSE_MS);
      });
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
        passageStartedAtRef.current = Date.now();
        isAnimatingRef.current = false;
      });
    });
  };

  if (!story) {
    return <View style={styles.container} />;
  }

  return (
    <Pressable onPress={handleAdvance} style={styles.container}>
      <View style={styles.metaBlock}>
        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.author}>— {story.author}</Text>
      </View>

      <View style={styles.centerBlock}>
        <View pointerEvents="none" style={styles.watermark}>
          <LighthouseWatermark />
        </View>
        <Animated.Text style={[styles.passage, { opacity: fade }]}>{story.passages[passageIndex]}</Animated.Text>
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
  title: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.cormorantItalic,
    fontSize: 15,
  },
  author: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.tiny,
    marginTop: theme.spacing.xs,
    opacity: 0.75,
  },
  centerBlock: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 36,
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
