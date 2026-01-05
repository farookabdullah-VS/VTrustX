# How to Enable USB Debugging on Motorola G35 (Android)

To enable your phone to be controlled by the VTrustX Agent, follow these steps to turn on **USB Debugging**.

## Step 1: Enable Developer Options
1.  Open **Settings**.
2.  Scroll down and tap **About phone**.
3.  Scroll to the very bottom to find **Build number**.
4.  **Tap "Build number" 7 times** quickly.
    *   You might see a popup counting down: "You are now 3 steps away from being a developer."
    *   Continue tapping until it says **"You are now a developer!"** (You may need to enter your PIN/Passcode).

## Step 2: Enable USB Debugging
1.  Go back to the main **Settings** menu.
2.  Tap **System** -> **Developer options**. (Sometimes it's directly in Settings or under "Advanced").
3.  Scroll down to the **Debugging** section.
4.  Toggle the switch for **USB debugging** to **ON**.
5.  A warning popup will appear asking for permission. Tap **OK**.

## Step 3: Authorization (Crunch Time)
1.  Plug your Motorola phone into your PC via USB cable.
2.  Look at your phone screen. A popup should appear: **"Allow USB debugging?"**
3.  Important: Check the box **"Always allow from this computer"**.
4.  Tap **Allow**.

## Verification
To check if it worked:
1.  Open your PC terminal/CMD.
2.  Go to your ADB folder: `CD D:\platform-tools`
3.  Type: `adb devices`
4.  You should see your device ID followed by the word `device`.
    *   *If it says `unauthorized`, unplug and check your phone screen for the permission popup again.*
