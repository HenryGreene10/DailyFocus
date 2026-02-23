# Project Brief: DailyFocus - Focus Story Trainer (M0)

## Product concept
DailyFocus is an iOS-first focus trainer built around one strict interaction: complete a story session without leaving the app. The product is intentionally minimalist. A user starts a story, reads through every page in sequence, and gets one binary outcome.

- Win: user reaches the final page.
- Fail: app moves out of foreground during an active session, or user manually quits.

The mechanic trains uninterrupted attention by removing optionality while in-session.

## M0 scope
M0 ships the smallest end-to-end loop in Expo Go:

- Home -> Session -> Result flow.
- One bundled demo story (3 pages) so the experience is testable offline.
- AppState-based failure when app is backgrounded during session.
- No pause mode, no break mode.
- Per-page minimum display time before advancing.
- Session keep-awake while active.
- Local progress persistence using AsyncStorage.
- Offline-first runtime behavior (bundled content + local state).

## Strict non-goals (M0)
The following are explicitly out of scope for M0:

- User accounts or auth.
- Backend services, sync, or cloud storage.
- Cosmetic polish passes and advanced design systems.
- In-session analytics views, progress bars, or live stats.
- Multiple story packs, story editor, or dynamic downloads.

## Later
Potential follow-ups after M0 stability:

- More bundled story packs and difficulty tiers.
- Better fail-recovery UX and session streak views (outside session).
- Session history screen with longitudinal trends.
- Haptics/audio cues for transitions.
- A/B testing of page timing and completion framing.
- Optional backup/sync once offline behavior is proven.
