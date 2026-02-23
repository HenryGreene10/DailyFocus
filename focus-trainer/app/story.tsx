import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { storyData } from '@/constants/storyData';
import { theme } from '@/constants/theme';

const STORY_STATS_KEY = 'dailyfocus_stats_v1';
const PASSAGE_MIN_MS = 2000;

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

  return updated;
}

export default function StoryScreen() {
  const router = useRouter();
  const [passageIndex, setPassageIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const startedAtRef = useRef(Date.now());
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    setCanAdvance(false);

    const timeout = setTimeout(() => {
      setCanAdvance(true);
    }, PASSAGE_MIN_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [passageIndex]);

  const handleAdvance = async () => {
    if (!canAdvance || isAnimatingRef.current) {
      return;
    }

    const isLastPassage = passageIndex === storyData.passages.length - 1;

    if (isLastPassage) {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      await completeStory(elapsedSeconds);
      router.replace('/achievement' as never);
      return;
    }

    isAnimatingRef.current = true;

    Animated.timing(fade, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setPassageIndex((prev) => prev + 1);
      Animated.timing(fade, {
        toValue: 1,
        duration: 800,
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
    fontSize: theme.fontSizes.story,
    lineHeight: 32,
    paddingHorizontal: 44,
    textAlign: 'center',
  },
});
