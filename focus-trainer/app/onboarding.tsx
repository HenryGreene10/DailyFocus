import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const STEP_FADE_MS = Platform.OS === 'ios' ? 320 : 240;

const steps = [
  'Tap to begin focusing.',
  'Each passage has a minimum display time before you can continue.',
  'If you leave the app during a story, you fail.\nThese instructions will not appear again.',
] as const;

const CORNERS = [
  { key: 'tl', style: { top: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'tr', style: { top: theme.spacing.xl, right: theme.spacing.xl } },
  { key: 'bl', style: { bottom: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'br', style: { bottom: theme.spacing.xl, right: theme.spacing.xl } },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0.3)).current;
  const stepFade = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);

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
      router.replace('/' as never);
    });
  };

  return (
    <Animated.View style={{ flex: 1, opacity: screenFade }}>
      <Pressable onPress={handleNext} style={styles.container}>
        {CORNERS.map((corner) => (
          <Text key={corner.key} style={[styles.cornerStar, corner.style]}>
            ✦
          </Text>
        ))}

        <View style={styles.content}>
          <View style={styles.titleArea}>
            <Text style={styles.title}>DailyFocus</Text>
          </View>
          <View style={styles.instructionArea}>
            <Animated.Text style={[styles.message, { opacity: stepFade }]}>
              {steps[stepIndex]}
            </Animated.Text>
          </View>
        </View>

        <Animated.Text style={[styles.hint, { opacity: pulse }]}>tap anywhere to continue</Animated.Text>
      </Pressable>
    </Animated.View>
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
    paddingHorizontal: 44,
  },
  titleArea: {
    alignItems: 'center',
  },
  instructionArea: {
    alignItems: 'center',
    borderTopColor: '#C4A88266',
    borderTopWidth: 1,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
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
  hint: {
    bottom: theme.spacing.lg,
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    letterSpacing: 2,
    position: 'absolute',
    textTransform: 'uppercase',
  },
  cornerStar: {
    color: theme.colors.accentLight,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.bodyLarge,
    opacity: 0.3,
    position: 'absolute',
  },
});
