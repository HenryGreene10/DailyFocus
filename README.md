# DailyFocus

DailyFocus trains attention through short narrative focus exercises. The app presents a story one page at a time — you can only advance after reading for a few seconds, and leaving the app mid-session counts as a failure.

Coming soon to the App Store.

---

## How It Works

- A session presents a short story across multiple pages
- Each page enforces a minimum read time before advancing
- Backgrounding the app or quitting mid-session marks the session as failed
- Completing the full story marks it as a win
- No pause, no breaks, no progress stats during the session

---

## Stack

- React Native (Expo)
- TypeScript
- expo-router
- EAS Build for App Store distribution

---

## Structure

```
src/
  content/     # Story content
  domain/      # Core session logic
  services/    # Background detection, session tracking
  state/       # App state management
  storage/     # Local persistence
  ui/          # Components and screens
```

---

Built by [Henry Greene](https://github.com/HenryGreene10)
