export interface Page {
  id: string;
  text: string;
  minDisplayMs: number;
}

export interface Story {
  id: string;
  title: string;
  pages: Page[];
}

export type SessionOutcome = 'completed' | 'failed';

export interface SessionHistoryEntry {
  storyId: string;
  outcome: SessionOutcome;
  reason?: string;
  endedAt: string;
}

export interface Progress {
  completedStoryIds: string[];
  sessionHistory: SessionHistoryEntry[];
}
