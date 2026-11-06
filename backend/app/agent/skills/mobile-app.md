---
name: mobile-app
title: Mobile app
category: Build
description: Build cross platform iOS and Android apps with Expo and React Native, from screens to store builds. Use when the user wants a phone app.
---
# Mobile app

## Start
- npx create-expo-app@latest with the TypeScript template and Expo Router for file based navigation.
- Run in the browser with npx expo start --web to check screens quickly in the sandbox; real devices use the Expo Go app with the QR code from npx expo start --tunnel.

## Build screens
- Use SafeAreaView, platform fonts and sizes (body 16, tap targets at least 44 points). Support dark mode with useColorScheme.
- Lists with FlatList, never map inside a ScrollView for long data. Images with expo-image.
- Forms with keyboard avoiding views and the right keyboard types (email, numeric).
- For Persian and Arabic use I18nManager for RTL and test the layout flipped.

## Data and features
- Fetch from your API with a small client and react-query for caching and loading states. Store tokens in expo-secure-store, not AsyncStorage.
- Use Expo modules for camera, location, notifications and files, and ask for permissions only when the feature is used, with a sentence that explains why.

## Ship
- eas build for store builds and eas submit to upload. Set the app name, bundle id, icons and splash in app.json first.
- Test on a small and a large screen and on both platforms before calling it done.
