# Workout Tracker

React Native / Expo workout tracker with local `AsyncStorage` persistence.

## Features

- Create and edit workout plans
- Select a workout as today’s training session
- Preview and start an active workout
- Track sets, reps, weight and completed sets
- Finish workouts and view completed workout summaries
- Separate workout plans and workout history
- Local workout cover images based on workout type
- Drag-and-drop exercise reordering
- Local progress and profile statistics

## Tech Stack

- React Native
- Expo
- TypeScript
- React Navigation
- AsyncStorage
- Expo Vector Icons
- Expo Linear Gradient
- react-native-calendars
- react-native-draggable-flatlist

## Requirements

- Node.js 20+
- npm
- Full Xcode app for iOS simulator builds
- Android Studio for Android emulator builds

## Install

```bash
npm install
```

## Run

```bash
npm run start
```

Then open:

- `i` for iOS simulator
- `a` for Android emulator
- Expo Go by scanning the QR code

## Test On A Phone With Mobile Data

Use Expo tunnel when the phone is not on the same Wi-Fi as the Mac, for example when testing in the gym on mobile data.

```bash
npx expo start --tunnel --clear
```

Then open Expo Go on the phone and scan the QR code.

Notes:

- Keep the Mac awake, online, and the Expo terminal running.
- Stop the server with `Ctrl + C` when done.
- If Expo tunnel has port issues on Node 22, use Node 20 LTS:

```bash
nvm use 20
npx expo start --tunnel --clear
```

## Native run

```bash
npm run ios
npm run android
```

If iOS native dependencies are out of sync after installs:

```bash
npx pod-install ios
```

If `expo run:ios` says Xcode is not fully installed, finish the Apple toolchain setup:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

## Checks

```bash
npm run typecheck
npm run check-deps
```
