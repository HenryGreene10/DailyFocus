import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
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
const CURRENT_STORY_INDEX_KEY = 'dailyfocus_current_story_index_v1';
const LAST_OUTCOME_TODAY_KEY = 'dailyfocus_last_outcome_today_v1';
const LAST_OUTCOME_DATE_KEY = 'dailyfocus_last_outcome_date_v1';
const TONIGHT_REMINDER_ID_KEY = 'dailyfocus_tonight_reminder_notification_id_v1';
const REMINDER_NOTIFICATION_TYPE = 'daily_reminder';
const TRANSITION_FADE_MS = Platform.OS === 'ios' ? 980 : 820;
const TRANSITION_FADE_EASING = Easing.inOut(Easing.ease);

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

function wrapLine(line: string, targetLineLength: number): string[] {
  const words = line.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const nextWord = words[i];
    const candidateLine = `${currentLine} ${nextWord}`;
    if (candidateLine.length <= targetLineLength) {
      currentLine = candidateLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = nextWord;
  }

  lines.push(currentLine);

  const lastIndex = lines.length - 1;
  if (lastIndex > 0) {
    const lastWords = lines[lastIndex].split(' ');
    const previousWords = lines[lastIndex - 1].split(' ');
    if (lastWords.length === 1 && previousWords.length > 1) {
      const movedWord = previousWords.pop();
      if (movedWord) {
        lines[lastIndex - 1] = previousWords.join(' ');
        lines[lastIndex] = `${movedWord} ${lines[lastIndex]}`;
      }
    }
  }

  return lines;
}

function balancePassageLines(text: string, targetLineLength = 30): string {
  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  if (!normalizedText) {
    return '';
  }

  const authoredLines = normalizedText.split('\n');
  const renderedLines: string[] = [];

  for (const authoredLine of authoredLines) {
    const normalizedLine = authoredLine.replace(/\s+/g, ' ').trim();
    if (!normalizedLine) {
      renderedLines.push('');
      continue;
    }

    renderedLines.push(...wrapLine(normalizedLine, targetLineLength));
  }

  return renderedLines.join('\n');
}

function runFade(value: Animated.Value, toValue: number): Promise<boolean> {
  return new Promise((resolve) => {
    Animated.timing(value, {
      toValue,
      duration: TRANSITION_FADE_MS,
      easing: TRANSITION_FADE_EASING,
      useNativeDriver: true,
    }).start(({ finished }) => {
      resolve(finished);
    });
  });
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
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const story: StoryEntry | undefined =
    stage1Stories.length > 0
      ? stage1Stories[Math.min(currentStoryIndex, stage1Stories.length - 1)]
      : undefined;
  const [passageIndex, setPassageIndex] = useState(0);
  const [blockedHint, setBlockedHint] = useState<{ x: number; y: number } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const passageOpacity = useRef(new Animated.Value(1)).current;
  const blockedHintOpacity = useRef(new Animated.Value(0)).current;
  const blockedHintRunIdRef = useRef(0);
  const passageStartedAtRef = useRef(Date.now());
  const startedAtRef = useRef(Date.now());
  const isTransitioningFadeRef = useRef(false);
  const isCompletingRef = useRef(false);
  const isRoutingRef = useRef(false);
  const sessionEndedRef = useRef(false);

  useEffect(() => {
    void (async () => {
      const rawIndex = await AsyncStorage.getItem(CURRENT_STORY_INDEX_KEY);
      if (!rawIndex) {
        return;
      }

      const parsed = Number(rawIndex);
      if (Number.isFinite(parsed) && parsed >= 0) {
        setCurrentStoryIndex(parsed);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    setPassageIndex(0);
    passageStartedAtRef.current = Number.POSITIVE_INFINITY;
    startedAtRef.current = Date.now();
    isTransitioningFadeRef.current = true;
    isCompletingRef.current = false;
    isRoutingRef.current = false;
    sessionEndedRef.current = false;
    setIsCompleting(false);
    contentOpacity.stopAnimation();
    passageOpacity.stopAnimation();
    contentOpacity.setValue(0);
    passageOpacity.setValue(1);

    void (async () => {
      const finished = await runFade(contentOpacity, 1);
      if (!finished || cancelled) {
        return;
      }

      isTransitioningFadeRef.current = false;
      passageStartedAtRef.current = Date.now();
    })();

    return () => {
      cancelled = true;
    };
  }, [contentOpacity, currentStoryIndex, passageOpacity]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (sessionEndedRef.current) {
        return;
      }

      if (nextState === 'inactive' || nextState === 'background') {
        sessionEndedRef.current = true;
        isCompletingRef.current = true;
        isRoutingRef.current = true;
        isTransitioningFadeRef.current = false;
        setIsCompleting(true);
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
        isCompletingRef.current = true;
        isRoutingRef.current = true;
        isTransitioningFadeRef.current = false;
        setIsCompleting(true);
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
    if (
      sessionEndedRef.current ||
      isCompletingRef.current ||
      isRoutingRef.current ||
      isTransitioningFadeRef.current
    ) {
      showBlockedHint(event);
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

    const isLastPassage = passageIndex === story.passages.length - 1;

    if (isLastPassage) {
      sessionEndedRef.current = true;
      isCompletingRef.current = true;
      isTransitioningFadeRef.current = true;
      await runFade(contentOpacity, 0);
      isTransitioningFadeRef.current = false;
      setIsCompleting(true);
      isRoutingRef.current = true;
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const updated = await completeStory(elapsedSeconds);
      await AsyncStorage.setItem(LAST_COMPLETED_STORY_ID_KEY, story.id);
      const nextStoryIndex = currentStoryIndex + 1;
      await AsyncStorage.setItem(CURRENT_STORY_INDEX_KEY, String(nextStoryIndex));

      if (updated.storiesCompleted === 1) {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      }

      await syncTonightReminder();
      await Haptics.selectionAsync();
      router.replace('/achievement?outcome=completed' as never);
      return;
    }

    isTransitioningFadeRef.current = true;
    await runFade(passageOpacity, 0);
    if (sessionEndedRef.current || isCompletingRef.current || isRoutingRef.current) {
      return;
    }

    setPassageIndex((prev) => prev + 1);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });

    await runFade(passageOpacity, 1);
    if (sessionEndedRef.current || isCompletingRef.current || isRoutingRef.current) {
      return;
    }

    passageStartedAtRef.current = Date.now();
    isTransitioningFadeRef.current = false;
  };

  if (!story) {
    return <View style={styles.container} />;
  }

  const balancedPassage = balancePassageLines(story.passages[passageIndex]);

  return (
    <Pressable onPress={handleAdvance} style={styles.container}>
      {!isCompleting ? (
        <Animated.View style={[styles.storyContent, { opacity: contentOpacity }]}>
          <View style={styles.metaBlock}>
            <Text style={styles.title}>
              {story.title}
              {' by '}
              {story.author}
            </Text>
          </View>

          <View style={styles.centerBlock}>
            <View pointerEvents="none" style={styles.watermark}>
              <LighthouseWatermark />
            </View>
            <Animated.Text style={[styles.passage, { opacity: passageOpacity }]}>
              {balancedPassage}
            </Animated.Text>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.completionShield} />
      )}
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
  storyContent: {
    flex: 1,
    width: '100%',
  },
  completionShield: {
    flex: 1,
    width: '100%',
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
