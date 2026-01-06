
# iOS Application Setup Guide

This guide explains how to build the VTrustX web application for iOS using Capacitor.

## ⚠️ Important Requirement
**You strictly need a macOS computer with Xcode installed to build and run iOS applications.** 
The steps below **must be performed on a Mac**. You cannot build the iOS app directly on Windows.

## Prerequisites (On macOS)
1. **Xcode**: Install from the Mac App Store.
2. **CocoaPods**: Install via `sudo gem install cocoapods`.
3. **Node.js**: Ensure Node.js is installed.

## Setup Progress (Completed on Windows)
We have already:
1. Installed `@capacitor/ios`.
2. Added the `ios` platform folder to the project.
3. Configured the API to use the Cloud Run URL (`https://vtrustx-service-ewhlzzsutq-uc.a.run.app`) automatically when running on a device.

## How to Build & Run (On macOS)

### Step 1: Transfer Project
Move your project code to the Mac (git clone or copy).

### Step 2: Sync Changes
Navigate to the `client` folder and run:

```bash
cd client
npm install
npm run build
npx cap sync ios
```

### Step 3: Open in Xcode
Run the following command to open the project workspace:

```bash
npx cap open ios
```

### Step 4: Configure Signing
1. In Xcode, click on the **App** project in the left navigator.
2. Select the **App** target.
3. Go to the **Signing & Capabilities** tab.
4. Select a **Team** (you need an Apple Developer Account, or a free Apple ID for testing).
5. Ensure the **Bundle Identifier** is `com.vtrustx.app`.

### Step 5: Run on Simulator/Device
1. Select a simulator (e.g., iPhone 15) or connect your iPhone via USB.
2. Click the **Play** button (Run).

## Testing Procedure
1. **Launch App**: The app should load the VTrustX login screen.
2. **Login**: Attempt to log in. It will connect to the production Cloud Run server.
3. **Permissions**: If testing Voice AI, the app will request Microphone permission.

## Troubleshooting
- **Build Failed**: If you see CocoaPods errors, try running `cd ios/App && pod install` manually.
- **Network Error**: Ensure your internet connection is active to reach the backend.

## Production Build (IPA)
To archive for the App Store:
1. In Xcode: **Product** > **Archive**.
2. Deployment requires an active Apple Developer Program membership.
