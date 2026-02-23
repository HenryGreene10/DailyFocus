import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const STORY_STATS_KEY = 'dailyfocus_stats_v1';

type FocusStats = {
  storiesCompleted: number;
  minutesFocused: number;
  xp: number;
  level: number;
  lastCompletedDate: string;
  dayStreak: number;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AchievementScreen() {
  const router = useRouter();
  const { outcome } = useLocalSearchParams<{ outcome?: string }>();
  const pulse = useRef(new Animated.Value(0.3)).current;
  const [stats, setStats] = useState<FocusStats>({
    storiesCompleted: 0,
    minutesFocused: 0,
    xp: 0,
    level: 1,
    lastCompletedDate: '',
    dayStreak: 0,
  });

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.8,
          duration: 1250,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1250,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

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
          storiesCompleted:
            typeof parsed.storiesCompleted === 'number' && Number.isFinite(parsed.storiesCompleted)
              ? parsed.storiesCompleted
              : 0,
          minutesFocused:
            typeof parsed.minutesFocused === 'number' && Number.isFinite(parsed.minutesFocused)
              ? parsed.minutesFocused
              : 0,
          xp: typeof parsed.xp === 'number' && Number.isFinite(parsed.xp) ? parsed.xp : 0,
          level: typeof parsed.level === 'number' && Number.isFinite(parsed.level) ? parsed.level : 1,
          lastCompletedDate: typeof parsed.lastCompletedDate === 'string' ? parsed.lastCompletedDate : '',
          dayStreak:
            typeof parsed.dayStreak === 'number' && Number.isFinite(parsed.dayStreak)
              ? parsed.dayStreak
              : 0,
        });
      } catch {
        // Keep defaults on invalid storage payload.
      }
    }

    hydrateStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const storiesCompleted = String(stats.storiesCompleted);
  const minutesFocused = String(Math.round(stats.minutesFocused));
  const dayStreak = String(stats.dayStreak);
  const level = String(stats.level);
  const failed = outcome === 'failed';

  return (
    <Pressable onPress={() => router.replace('/')} style={styles.container}>
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />

      <View style={styles.content}>
        <Text style={styles.label}>{failed ? 'Session Failed' : 'Story Complete'}</Text>
        <Text style={styles.title}>{failed ? 'Focus Broke' : 'Focus Deepens'}</Text>
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

        <Animated.Text style={[styles.hint, { opacity: pulse }]}>tap to return home</Animated.Text>
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
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.cormorantLight,
    fontSize: theme.fontSizes.stat,
    fontWeight: '300',
  },
  statLabel: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.tiny,
    letterSpacing: 2,
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  divider: {
    backgroundColor: theme.colors.accent,
    height: 70,
    marginHorizontal: theme.spacing.sm,
    opacity: 0.2,
    width: 1,
  },
  hint: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    letterSpacing: 2,
    marginTop: theme.spacing.xxl,
    textTransform: 'uppercase',
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
