import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getStories } from '@/src/content/storyPack';
import { sessionService } from '@/src/services/SessionService';
import { useProgressStore } from '@/src/state/useProgressStore';
import { Button } from '@/src/ui/components/Button';
import { Screen } from '@/src/ui/components/Screen';
import { Text } from '@/src/ui/components/Text';
import { theme } from '@/src/ui/theme';

export default function SessionScreen() {
  const router = useRouter();
  const { storyId } = useLocalSearchParams<{ storyId?: string }>();
  const { recordSession } = useProgressStore();
  const [pageIndex, setPageIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);

  const story = useMemo(
    () => getStories().find((candidate) => candidate.id === storyId) ?? null,
    [storyId],
  );

  const page = story?.pages[pageIndex];

  useEffect(() => {
    if (!story) {
      return;
    }

    const activeSession = sessionService.getActiveSession();
    if (!activeSession || activeSession.storyId !== story.id) {
      sessionService.startSession(story.id);
    }
  }, [story]);

  useEffect(() => {
    if (!story || !page) {
      return;
    }

    setCanAdvance(false);
    const timeoutId = setTimeout(() => {
      setCanAdvance(true);
    }, page.minDisplayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [page, story]);

  useEffect(() => {
    const unsubscribe = sessionService.subscribe(async (result) => {
      if (!story || result.storyId !== story.id) {
        return;
      }

      await recordSession(result);

      router.replace({
        pathname: '/result',
        params: {
          outcome: result.outcome,
          reason: result.reason ?? '',
        },
      });
    });

    return () => {
      unsubscribe();
    };
  }, [recordSession, router, story]);

  if (!story || !page) {
    return (
      <Screen style={styles.container}>
        <Text style={styles.center}>Story not found.</Text>
        <Button onPress={() => router.replace('/')}>Back Home</Button>
      </Screen>
    );
  }

  const handleNext = () => {
    if (!canAdvance) {
      return;
    }

    const isLastPage = pageIndex === story.pages.length - 1;

    if (isLastPage) {
      sessionService.completeSession();
      return;
    }

    setPageIndex((prev) => prev + 1);
  };

  const handleQuit = () => {
    sessionService.failSession('quit');
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.storyBody}>
        <Text style={styles.pageText}>{page.text}</Text>
      </View>
      <View style={styles.actions}>
        <Button disabled={!canAdvance} onPress={handleNext}>
          {pageIndex === story.pages.length - 1 ? 'Finish' : 'Next'}
        </Button>
        <Button onPress={handleQuit}>Quit Session</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  center: {
    textAlign: 'center',
  },
  storyBody: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 320,
    padding: theme.spacing.lg,
  },
  pageText: {
    textAlign: 'center',
  },
  actions: {
    gap: theme.spacing.sm,
  },
});
