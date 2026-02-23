import AsyncStorage from '@react-native-async-storage/async-storage';

import { Progress } from '@/src/domain/types';

const PROGRESS_KEY = 'focus-trainer/progress/v1';

export const EMPTY_PROGRESS: Progress = {
  completedStoryIds: [],
  sessionHistory: [],
};

export async function saveProgress(progress: Progress): Promise<void> {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export async function loadProgress(): Promise<Progress> {
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  if (!raw) {
    return EMPTY_PROGRESS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Progress>;

    return {
      completedStoryIds: Array.isArray(parsed.completedStoryIds) ? parsed.completedStoryIds : [],
      sessionHistory: Array.isArray(parsed.sessionHistory) ? parsed.sessionHistory : [],
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}
