import AsyncStorage from '@react-native-async-storage/async-storage';

import { stage1Stories } from '@/constants/stories';

const REMOTE_URL =
  'https://raw.githubusercontent.com/HenryGreene10/DailyFocus/main/content/stories.json';
const CACHE_KEY = 'dailyfocus_stories_cache_v1';

export type StoryEntry = {
  id: string;
  title: string;
  author: string;
  completeNote: string;
  stage: number;
  minDisplayMs: number;
  passages: string[];
};

function isStoryEntry(v: unknown): v is StoryEntry {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.title === 'string' &&
    typeof s.author === 'string' &&
    typeof s.minDisplayMs === 'number' &&
    Array.isArray(s.passages) &&
    (s.passages as unknown[]).length > 0
  );
}

function parseManifest(data: unknown): StoryEntry[] | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.stories) || d.stories.length === 0) return null;
  const valid = (d.stories as unknown[]).filter(isStoryEntry);
  return valid.length > 0 ? valid : null;
}

export function getBundledStories(): StoryEntry[] {
  return stage1Stories as unknown as StoryEntry[];
}

export async function loadCachedStories(): Promise<StoryEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return parseManifest(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function fetchAndCacheStories(): Promise<StoryEntry[] | null> {
  try {
    const res = await fetch(REMOTE_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    const stories = parseManifest(data);
    if (!stories) return null;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    return stories;
  } catch {
    return null;
  }
}
