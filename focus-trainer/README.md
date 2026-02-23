# Focus Trainer (Expo)

Minimal iOS-first Focus Story Trainer (M0) built with Expo + expo-router.

## M0 flow
- Home -> Session -> Result
- Win: reach end of story
- Fail: app backgrounds during active session OR user taps quit
- No pause, no breaks, no in-session progress bar/stats

## Run
```bash
npm install
npx expo start
```

Open in Expo Go on iPhone.

## Smoke test (M0)
1. Launch app to Home.
2. Tap `Start`.
3. On Session, verify `Next` stays disabled for ~4s on each page.
4. Reach final page and tap `Finish`.
5. Verify Result shows `Completed`, then tap `Continue` back to Home.
6. Start another session.
7. While on Session, send app to background (home gesture/app switch).
8. Return to app and verify Result shows `Failed` with reason `backgrounded`.
9. Start again and tap `Quit Session`; verify Result shows `Failed` with reason `quit`.

## Structure
```text
src/
  content/
  domain/
  services/
  state/
  storage/
  ui/
```
