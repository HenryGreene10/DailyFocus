import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Progress } from '@/src/domain/types';
import { SessionResult } from '@/src/services/SessionService';
import { EMPTY_PROGRESS, loadProgress, saveProgress } from '@/src/storage/progressStorage';

interface ProgressStoreValue {
  progress: Progress;
  isHydrated: boolean;
  recordSession: (result: SessionResult) => Promise<void>;
}

const ProgressStoreContext = createContext<ProgressStoreValue | undefined>(undefined);

function buildNextProgress(prev: Progress, result: SessionResult): Progress {
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

export function ProgressStoreProvider({ children }: PropsWithChildren) {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
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

  const recordSession = useCallback(async (result: SessionResult) => {
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

  return <ProgressStoreContext.Provider value={value}>{children}</ProgressStoreContext.Provider>;
}

export function useProgressStore(): ProgressStoreValue {
  const context = useContext(ProgressStoreContext);

  if (!context) {
    throw new Error('useProgressStore must be used within ProgressStoreProvider');
  }

  return context;
}
