import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const STORY_STATS_KEY = 'dailyfocus_stats_v1';
const REMINDER_SETTINGS_KEY = 'dailyfocus_reminder_v1';
const REMINDER_NOTIFICATION_TYPE = 'daily_reminder';

type FocusStats = {
  storiesCompleted: number;
  minutesFocused: number;
  xp: number;
  level: number;
  lastCompletedDate: string;
  dayStreak: number;
};

type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

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

function formatTwoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

function clampHour(hour: number): number {
  if (hour < 0) {
    return 23;
  }
  if (hour > 23) {
    return 0;
  }
  return hour;
}

function clampMinute(minute: number): number {
  if (minute < 0) {
    return 55;
  }
  if (minute > 55) {
    return 0;
  }
  return minute;
}

async function cancelReminderNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminderItems = scheduled.filter(
    (item) => item.content.data?.type === REMINDER_NOTIFICATION_TYPE,
  );

  await Promise.all(
    reminderItems.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

async function scheduleReminderNotification(hour: number, minute: number): Promise<void> {
  await cancelReminderNotifications();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'DailyFocus',
      body: "Take a moment for today's story.",
      data: { type: REMINDER_NOTIFICATION_TYPE },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: Platform.OS === 'android' ? 'daily-reminder' : undefined,
      hour,
      minute,
    },
  });
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
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [reminderBusy, setReminderBusy] = useState(false);

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

    async function hydrateReminderSettings() {
      const raw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
      if (!raw || !isMounted) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
        setReminderEnabled(parsed.enabled === true);
        setReminderHour(clampHour(sanitizeNumber(parsed.hour, 20)));
        setReminderMinute(clampMinute(sanitizeNumber(parsed.minute, 0)));
      } catch {
        // Keep defaults on invalid storage payload.
      }
    }

    hydrateStats();
    hydrateReminderSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const storiesCompleted = String(stats.storiesCompleted);
  const minutesFocused = String(Math.round(stats.minutesFocused));
  const dayStreak = String(stats.dayStreak);
  const level = String(stats.level);
  const failed = outcome === 'failed';

  const persistReminderSettings = async (
    nextEnabled: boolean,
    nextHour: number,
    nextMinute: number,
  ) => {
    await AsyncStorage.setItem(
      REMINDER_SETTINGS_KEY,
      JSON.stringify({
        enabled: nextEnabled,
        hour: nextHour,
        minute: nextMinute,
      }),
    );
  };

  const handleToggleReminder = async () => {
    if (reminderBusy) {
      return;
    }

    const nextEnabled = !reminderEnabled;
    setReminderBusy(true);

    try {
      if (nextEnabled) {
        let permission = await Notifications.getPermissionsAsync();

        if (permission.status !== 'granted') {
          permission = await Notifications.requestPermissionsAsync();
        }

        if (permission.status !== 'granted') {
          await persistReminderSettings(false, reminderHour, reminderMinute);
          setReminderEnabled(false);
          return;
        }

        await scheduleReminderNotification(reminderHour, reminderMinute);
      } else {
        await cancelReminderNotifications();
      }

      await persistReminderSettings(nextEnabled, reminderHour, reminderMinute);
      setReminderEnabled(nextEnabled);
    } finally {
      setReminderBusy(false);
    }
  };

  const handleSaveReminderTime = async () => {
    if (reminderBusy) {
      return;
    }

    setReminderBusy(true);

    try {
      if (reminderEnabled) {
        await scheduleReminderNotification(reminderHour, reminderMinute);
      }

      await persistReminderSettings(reminderEnabled, reminderHour, reminderMinute);
    } finally {
      setReminderBusy(false);
    }
  };

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

        <View onStartShouldSetResponder={() => true} style={styles.reminderSection}>
          <Text style={styles.reminderTitle}>Daily reminder</Text>

          <View style={styles.reminderControls}>
            <Pressable onPress={handleToggleReminder} style={styles.reminderButton}>
              <Text style={styles.reminderButtonText}>
                {reminderEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </Pressable>

            <View style={styles.timePicker}>
              <Pressable
                onPress={() => setReminderHour((prev) => clampHour(prev - 1))}
                style={styles.timeAdjustButton}>
                <Text style={styles.timeAdjustText}>−</Text>
              </Pressable>
              <Text style={styles.timeText}>{formatTwoDigits(reminderHour)}</Text>
              <Text style={styles.timeSeparator}>:</Text>
              <Text style={styles.timeText}>{formatTwoDigits(reminderMinute)}</Text>
              <Pressable
                onPress={() => setReminderHour((prev) => clampHour(prev + 1))}
                style={styles.timeAdjustButton}>
                <Text style={styles.timeAdjustText}>+</Text>
              </Pressable>
              <Pressable
                onPress={() => setReminderMinute((prev) => clampMinute(prev - 5))}
                style={styles.timeAdjustButton}>
                <Text style={styles.timeAdjustText}>−</Text>
              </Pressable>
              <Pressable
                onPress={() => setReminderMinute((prev) => clampMinute(prev + 5))}
                style={styles.timeAdjustButton}>
                <Text style={styles.timeAdjustText}>+</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleSaveReminderTime} style={styles.reminderButton}>
              <Text style={styles.reminderButtonText}>{reminderBusy ? '...' : 'Save'}</Text>
            </Pressable>
          </View>
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
  reminderSection: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  reminderTitle: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.tiny,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  reminderControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  reminderButton: {
    borderColor: theme.colors.accent,
    borderWidth: 1,
    opacity: 0.6,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  reminderButtonText: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.tiny,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timePicker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  timeAdjustButton: {
    borderColor: theme.colors.accent,
    borderWidth: 1,
    opacity: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timeAdjustText: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.tiny,
  },
  timeText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    minWidth: 20,
    textAlign: 'center',
  },
  timeSeparator: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
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
