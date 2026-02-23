import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { EMPTY_PROGRESS, loadProgress, saveProgress } from '@/src/storage/progressStorage';

const ProgressStoreContext = createContext(undefined);

function buildNextProgress(prev, result) {
  const completedStoryIds =
    result.outcome === 'completed' && !prev.completedStoryIds.includes(result.storyId)
      ? [...prev.completedStoryIds, result.storyId]
      : prev.completedStoryIds;

  return {
    completedStoryIds,
    sessionHistory: [
      ...prev.sessionHistory,
      {
        storyId: result.storyId,
        outcome: result.outcome,
        reason: result.reason,
        endedAt: result.endedAt,
      },
    ],
  };
}

export function ProgressStoreProvider({ children }) {
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function hydrate() {
      try {
        const saved = await loadProgress();
        if (isActive) {
          setProgress(saved);
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  const recordSession = useCallback(async (result) => {
    let nextProgress = EMPTY_PROGRESS;

    setProgress((prev) => {
      nextProgress = buildNextProgress(prev, result);
      return nextProgress;
    });

    await saveProgress(nextProgress);
  }, []);

  const value = useMemo(
    () => ({
      progress,
      isHydrated,
      recordSession,
    }),
    [isHydrated, progress, recordSession],
  );

  return createElement(ProgressStoreContext.Provider, { value }, children);
}

export function useProgressStore() {
  const context = useContext(ProgressStoreContext);

  if (!context) {
    throw new Error('useProgressStore must be used within ProgressStoreProvider');
  }

  return context;
}
