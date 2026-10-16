# Forkwise for Android

The Forkwise mobile app, built with React, Vite and Capacitor. It uses the same backend as the website (`https://api.forkwise.online`).

## What you need

- Node.js 20 or newer
- Android Studio (it includes the Android SDK and Java)

## Run it on a phone

```bash
cd mobile
npm install
npm run build
npx cap sync android
npx cap open android
```

Android Studio opens. Connect your phone with USB debugging on (or start an emulator) and press the green Run button.

## Make an APK

In Android Studio: **Build > Build App Bundle(s) / APK(s) > Build APK(s)**. The file is saved in `android/app/build/outputs/apk/debug/`.

## After you change the code

```bash
npm run build
npx cap sync android
```

## Change the app icon

Replace the images in `assets/` and run:

```bash
npx @capacitor/assets generate --android
```

## Settings

The app talks to `https://api.forkwise.online` by default. To use another server, copy `.env.example` to `.env` and change the URLs before `npm run build`.
