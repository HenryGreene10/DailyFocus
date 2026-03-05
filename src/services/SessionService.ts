import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { AppState, AppStateStatus } from 'react-native';

import { SessionOutcome } from '@/src/domain/types';

const KEEP_AWAKE_TAG = 'focus-story-session';

export interface SessionResult {
  storyId: string;
  outcome: SessionOutcome;
  reason?: string;
  endedAt: string;
}

interface ActiveSession {
  storyId: string;
  startedAt: string;
}

type SessionListener = (result: SessionResult) => void;

class SessionService {
  private activeSession: ActiveSession | null = null;
  private listeners = new Set<SessionListener>();
  private appState: AppStateStatus = AppState.currentState;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  startSession(storyId: string): void {
    if (this.activeSession) {
      this.failSession('restarted');
    }

    this.activeSession = {
      storyId,
      startedAt: new Date().toISOString(),
    };

    activateKeepAwake(KEEP_AWAKE_TAG);
  }

  completeSession(): SessionResult | null {
    return this.endSession('completed');
  }

  failSession(reason: string): SessionResult | null {
    return this.endSession('failed', reason);
  }

  getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private endSession(outcome: SessionOutcome, reason?: string): SessionResult | null {
    if (!this.activeSession) {
      return null;
    }

    const result: SessionResult = {
      storyId: this.activeSession.storyId,
      outcome,
      reason,
      endedAt: new Date().toISOString(),
    };

    this.activeSession = null;
    deactivateKeepAwake(KEEP_AWAKE_TAG);

    this.listeners.forEach((listener) => listener(result));

    return result;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const wasActive = this.appState === 'active';
    this.appState = nextAppState;

    if (wasActive && nextAppState !== 'active' && this.activeSession) {
      this.failSession('backgrounded');
    }
  };
}

export const sessionService = new SessionService();
