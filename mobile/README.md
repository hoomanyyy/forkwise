# Forkwise for Android

The Forkwise mobile app, built with React, Vite and Capacitor. It uses the same backend as the website (`https://api.forkwiseai.com`).

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

## Make an APK without Android Studio

Push the `mobile` folder to `main` (or open GitHub > Actions > Build Android APK > Run workflow). When the run is green, download **forkwise-apk** at the bottom of the run page.

## Make an APK in Android Studio

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

The app talks to `https://api.forkwiseai.com` by default. To use another server, copy `.env.example` to `.env` and change the URLs before `npm run build`.

## What is new in 1.1.0

- New design that matches forkwiseai.com
- Assistant tab: chat with any finished analysis
- Ask the Assistant from every result
- Plans and billing inside the app
- Two sample datasets on the New screen
- Analyst choices limited to what your plan allows
