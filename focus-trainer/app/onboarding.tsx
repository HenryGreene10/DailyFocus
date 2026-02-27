import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

const STEP_FADE_MS = Platform.OS === 'ios' ? 320 : 240;

const steps = [
  'Your daily focus practice.',
  'Turn on Do Not Disturb.\nRead a short story. That’s all.',
  'If you leave, the session ends.',
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const stepFade = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);

  const handleNext = async () => {
    if (isTransitioningRef.current) {
      return;
    }

    const isLast = stepIndex === steps.length - 1;

    if (!isLast) {
      isTransitioningRef.current = true;
      Animated.timing(stepFade, {
        toValue: 0,
        duration: STEP_FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setStepIndex((prev) => prev + 1);
        Animated.timing(stepFade, {
          toValue: 1,
          duration: STEP_FADE_MS,
          useNativeDriver: true,
        }).start(() => {
          isTransitioningRef.current = false;
        });
      });
      return;
    }

    isTransitioningRef.current = true;
    Animated.timing(screenFade, {
      toValue: 0,
      duration: Platform.OS === 'ios' ? 360 : 280,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/story' as never);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.screen, { opacity: screenFade }]}>
        <Pressable onPress={handleNext} style={styles.container}>
          <View style={styles.titleRegion}>
            <Text style={styles.title}>DailyFocus</Text>
          </View>

          <View style={styles.instructionRegion}>
            <View style={styles.divider} />
            <View style={styles.messageFrame}>
              <Animated.Text style={[styles.message, { opacity: stepFade }]}>
                {steps[stepIndex]}
              </Animated.Text>
            </View>
          </View>

          <View style={styles.ctaRegion}>
            <Text style={styles.cta}>Tap to Continue</Text>
          </View>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 44,
  },
  titleRegion: {
    alignItems: 'center',
    height: Platform.OS === 'ios' ? 220 : 204,
    justifyContent: 'flex-end',
    width: '100%',
  },
  instructionRegion: {
    alignItems: 'center',
    height: Platform.OS === 'ios' ? 184 : 168,
    justifyContent: 'flex-start',
    width: '100%',
  },
  divider: {
    backgroundColor: theme.colors.accent,
    height: StyleSheet.hairlineWidth,
    marginBottom: theme.spacing.md,
    opacity: 0.28,
    width: '72%',
  },
  messageFrame: {
    alignItems: 'center',
    height: Platform.OS === 'ios' ? 124 : 112,
    justifyContent: 'center',
    width: '100%',
  },
  ctaRegion: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.xl,
    width: '100%',
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.cormorantLight,
    fontSize: theme.fontSizes.hero,
    fontWeight: '300',
    letterSpacing: 2,
  },
  message: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.loraItalic,
    fontSize: Platform.OS === 'ios' ? theme.fontSizes.bodyLarge + 1 : theme.fontSizes.bodyLarge,
    lineHeight: Platform.OS === 'ios' ? 30 : 28,
    textAlign: 'center',
  },
  cta: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.small,
    letterSpacing: 2,
    opacity: 0.72,
    textTransform: 'uppercase',
  },
});
