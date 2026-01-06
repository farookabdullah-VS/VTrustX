
# Android Application Setup Guide

This guide explains how to convert the VTrustX web application into a native Android app using Capacitor.

## Prerequisites
1. **Android Studio**: Install the latest version from [developer.android.com](https://developer.android.com/studio).
2. **Java JDK 17**: Required for Android builds.

## Setup Progress (Already Completed)
We have already:
1. Installed Capacitor dependencies (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).
2. Initialized the project.
3. Added the Android platform.
4. Configured the app to use the Cloud Run API URL (`https://vtrustx-service-ewhlzzsutq-uc.a.run.app`) when running on mobile (see `client/src/axiosConfig.js`).

## How to Build & Run

### Step 1: Sync Changes
Whenever you update the React code (`client/src`), run these commands to update the Android project:

```bash
cd client
npm run build
npx cap sync
```

### Step 2: Open in Android Studio
To compile the APK or run on an emulator, execute:

```bash
cd client
npx cap open android
```

This will launch Android Studio.

### Step 3: Run on Emulator/Device
1. In Android Studio, wait for Gradle sync to finish.
2. Select an emulator (e.g., Pixel 6) or connect your physical device (enable **USB Debugging** in Developer Options).
3. Click the **Run** button (Green Play Icon).

## Testing Procedure
1. **Launch App**: Verify the app opens and shows the Login screen.
2. **Login**: Attempt to log in. Since we configured the Production URL, it should work using your Cloud credentials.
3. **Voice AI**: Test the new Voice AI feature.
   - Note: The Emulator's microphone support might be tricky; ensure it's enabled in Emulator settings.
   - Physical device testing is recommended for Audio features.

## Troubleshooting
- **Network Error**: If data doesn't load, ensure the device has internet access (to reach Cloud Run) or update `client/src/axiosConfig.js` to point to a local IP if developing locally.
- **WebView Version**: Ensure the Android device/emulator has an updated System WebView.

## Production Build (APK)
In Android Studio:
1. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2. The APK will be generated in `client/android/app/build/outputs/apk/debug/`.
