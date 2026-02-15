# Screenshot Guide for Google Play Store

## Requirements

**Phone Screenshots** (2-8 required):
- **Resolution**: 1080x1920 (portrait) or 1920x1080 (landscape)
- **Format**: PNG or JPG
- **Max file size**: 8 MB each
- **Minimum**: 2 screenshots
- **Maximum**: 8 screenshots

**What to Show**:
1. Dashboard/Home screen
2. Survey creation interface
3. Analytics/Reports view
4. Multi-channel distribution options
5. Real-time results
6. Settings/Profile (optional)

---

## Method 1: Capture from Running App (Recommended)

### Using Android Emulator

1. **Start Android Emulator**:
```bash
# From Android Studio
Tools → AVD Manager → Start emulator

# Or from command line
emulator -avd Pixel_7_API_34
```

2. **Install and run your app**:
```bash
cd client/android
adb install app/build/outputs/apk/debug/app-debug.apk
```

3. **Open the app and navigate to each screen**

4. **Take screenshots** (use one of these methods):

**Method A: Command Line**
```bash
# Take screenshot
adb shell screencap -p /sdcard/screenshot1.png

# Pull to computer
adb pull /sdcard/screenshot1.png screenshots/

# Delete from device
adb shell rm /sdcard/screenshot1.png
```

**Method B: Android Studio**
- Click camera icon in emulator toolbar
- Screenshots save to: `~/Documents/Screenshots/`

**Method C: Emulator Control Panel**
- Press `Ctrl + S` (Windows/Linux) or `Cmd + S` (Mac)
- Screenshot saves automatically

5. **Resize if needed**:
```bash
# Using ImageMagick
magick screenshot1.png -resize 1080x1920 screenshot1_resized.png
```

### Using Physical Android Device

1. **Enable USB Debugging**:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable USB Debugging

2. **Connect device via USB**

3. **Install app**:
```bash
adb install client/android/app/build/outputs/apk/debug/app-debug.apk
```

4. **Take screenshots**:
   - **On device**: Press Power + Volume Down
   - Screenshots save to: `DCIM/Screenshots/`

5. **Pull screenshots**:
```bash
adb pull /sdcard/DCIM/Screenshots/ ./screenshots/
```

---

## Method 2: Use Screenshot Automation Script

I've created a script to automate screenshot capture:

### Run the Screenshot Script

```bash
cd client/store-assets
node capture-screenshots.js
```

This will:
- Launch emulator
- Install app
- Navigate to key screens
- Capture screenshots automatically
- Save to `screenshots/` directory

---

## Method 3: Create Mockup Screenshots

If you don't have a running app yet, use the mockup HTML templates:

1. **Open mockup HTML files in Chrome**:
```bash
cd client/store-assets/mockups
chrome dashboard.html
```

2. **Set viewport size**:
   - Press `F12` (DevTools)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Select "Responsive"
   - Set dimensions: 1080x1920

3. **Take screenshot**:
   - Press `Ctrl+Shift+P`
   - Type "screenshot"
   - Select "Capture screenshot"

4. **Repeat for each mockup**

---

## Recommended Screenshots

### Screenshot 1: Dashboard/Home
**Shows**: Main dashboard with analytics overview
**Highlights**: Clean UI, key metrics, navigation

### Screenshot 2: Survey Builder
**Shows**: Drag-and-drop survey creation
**Highlights**: Question types, logic branching

### Screenshot 3: Multi-Channel Distribution
**Shows**: Email, SMS, WhatsApp options
**Highlights**: Easy distribution, contact management

### Screenshot 4: Real-Time Analytics
**Shows**: Charts, graphs, sentiment analysis
**Highlights**: AI-powered insights, data visualization

### Screenshot 5: Response Tracking
**Shows**: Live responses coming in
**Highlights**: Real-time updates, response details

### Screenshot 6: CRM Integration
**Shows**: Connected CRM systems
**Highlights**: Seamless sync, automation

### Screenshot 7: Mobile Reports
**Shows**: Analytics on mobile device
**Highlights**: Mobile-optimized, responsive design

### Screenshot 8: Settings/Profile
**Shows**: User profile, preferences
**Highlights**: Customization, security features

---

## Editing Screenshots

### Add Device Frames (Optional but Professional)

**Using Online Tools**:
- **MockUPhone**: https://mockuphone.com/
- **Previewed**: https://previewed.app/
- **Shotsnapp**: https://shotsnapp.com/

**Steps**:
1. Upload screenshot
2. Select device (Pixel, Samsung, etc.)
3. Choose frame color
4. Download with frame

### Add Text/Annotations (Optional)

**Using Figma** (Free):
1. Import screenshot
2. Add text overlays highlighting features
3. Export as PNG

**Using Canva** (Free):
1. Create 1080x1920 design
2. Upload screenshot as background
3. Add text, arrows, highlights
4. Download

---

## Quality Checklist

Before submitting, verify each screenshot:

- [ ] Resolution: 1080x1920 (or 1920x1080)
- [ ] No personal/test data visible
- [ ] No debug logs or developer info
- [ ] High quality (not blurry or pixelated)
- [ ] Shows real app functionality
- [ ] Consistent UI design across all screenshots
- [ ] No offensive or inappropriate content
- [ ] File size under 8 MB
- [ ] Format: PNG or JPG

---

## Automated Screenshot Script

See `capture-screenshots.js` for automated capture using Puppeteer/Appium.

---

## Quick Start

**Fastest method to get Play Store screenshots**:

1. **Start emulator**: `emulator -avd Pixel_7_API_34`
2. **Install app**: `adb install client/android/app/build/outputs/apk/debug/app-debug.apk`
3. **Open app and navigate to each screen**
4. **Take screenshots**: `adb shell screencap -p /sdcard/screen.png`
5. **Pull screenshots**: `adb pull /sdcard/screen.png`
6. **Repeat for 8 screens**
7. **Optional: Add device frames** using mockuphone.com
8. **Upload to Play Console**

---

## Tips

- **Use consistent device**: Pixel 7 recommended (common screen ratio)
- **Clean UI**: Remove test data, use realistic content
- **Good lighting**: Bright, clear screenshots
- **Feature highlights**: Show your best features first
- **Call to action**: First screenshot should grab attention
- **Localization**: Create screenshots in multiple languages if targeting international markets

---

## Troubleshooting

### "Screenshot is blank/black"
- **Solution**: Disable hardware acceleration in emulator

### "Wrong resolution"
- **Solution**: Use ImageMagick to resize: `magick input.png -resize 1080x1920 output.png`

### "File too large"
- **Solution**: Compress using: `magick input.png -quality 85 output.jpg`

### "App not installing"
- **Solution**: Uninstall first: `adb uninstall com.vtrustx.app`, then reinstall

---

## Resources

- **Android ADB Commands**: https://developer.android.com/studio/command-line/adb
- **Screenshot Tools**: https://developer.android.com/studio/debug/am-screenshot
- **Device Art Generator**: https://developer.android.com/distribute/marketing-tools/device-art-generator
- **Play Store Screenshot Guidelines**: https://support.google.com/googleplay/android-developer/answer/9866151
