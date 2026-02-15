# 🎨 SVG to PNG Conversion Instructions

## ✅ Easy Browser-Based Conversion (Recommended)

I've created a simple HTML converter that works in your browser!

### Steps:

1. **Open the converter:**
   - File: `client/store-assets/svg-to-png-converter.html`
   - Double-click to open in your browser
   - Or right-click → Open with → Chrome/Edge/Firefox

2. **Convert your files:**
   - Click "Convert All Files" button
   - Both PNG files will download automatically
   - app-icon.png (512x512)
   - feature-graphic.png (1024x500)

3. **Move files:**
   - Check your Downloads folder
   - Move PNG files to `client/store-assets/` folder
   - Now ready for Play Console upload!

### Features:
- ✅ No installation required
- ✅ Works offline
- ✅ High quality PNG output
- ✅ Automatic white background (required by Play Store)
- ✅ One-click conversion

---

## Alternative: Online Converter

If the HTML converter doesn't work:

1. Visit: https://cloudconvert.com/svg-to-png
2. Upload `app-icon.svg`
3. Set dimensions: 512x512
4. Download PNG
5. Repeat for `feature-graphic.svg` (1024x500)

---

## Alternative: ImageMagick (Advanced)

If you want command-line conversion:

1. Download: https://imagemagick.org/script/download.php#windows
2. Install with all options checked
3. Restart terminal
4. Run:
```bash
cd client/store-assets
magick app-icon.svg -resize 512x512 app-icon.png
magick feature-graphic.svg -resize 1024x500 feature-graphic.png
```

---

## Verification

After conversion, check that:
- [ ] app-icon.png is exactly 512x512 pixels
- [ ] feature-graphic.png is exactly 1024x500 pixels
- [ ] Both files have white/opaque backgrounds
- [ ] Images are clear and not blurry
- [ ] File sizes are reasonable (50-500 KB each)

You can check dimensions by:
- Right-click → Properties → Details
- Open in image viewer
- Open in browser and inspect

---

## Next Steps

Once you have the PNG files:

1. ✅ App icon PNG (512x512) - Ready for upload
2. ✅ Feature graphic PNG (1024x500) - Ready for upload
3. ⏳ Generate 2-8 screenshots (see screenshot-guide.md)
4. ⏳ Upload all assets to Play Console
5. ⏳ Submit app for review

---

## Need Help?

If conversion fails:
1. Make sure SVG files exist in the same folder
2. Try a different browser (Chrome recommended)
3. Use CloudConvert.com as backup
4. Contact support if issues persist

The HTML converter should work in any modern browser!
