# Figma Theme Import - Quick Start Guide

⚡ **Import your Figma design tokens in 3 simple steps**

---

## ✅ What You Need

1. **Figma Personal Access Token**
   - Get it from: https://www.figma.com/settings
   - Look for: "Personal access tokens"
   - Token format: `figd_xxxxxxxxxxxxx`

2. **Figma File URL**
   - Format: `https://www.figma.com/file/ABC123/YourDesign`
   - Must have access to the file

---

## 🚀 How to Use

### Step 1: Open Theme Settings
```
VTrustX → Settings → Theme Settings
```

### Step 2: Click "Import from Figma"
```
Look for button in top-right corner (next to Dark Mode toggle)
```

### Step 3: Fill in the Form
```
┌─────────────────────────────────────────────┐
│ Figma File URL                              │
│ [https://www.figma.com/file/ABC123/...]    │
│                                             │
│ Figma Access Token                          │
│ [••••••••••••••••••••••••••]               │
│                                             │
│ ☑ Apply immediately                        │
│ ☑ Save as preset                          │
│                                             │
│ [Cancel]  [Import Theme →]                 │
└─────────────────────────────────────────────┘
```

### Step 4: Preview & Apply
```
✅ Colors imported
✅ Typography imported
✅ Layout properties imported

[Back]  [Apply Theme →]
```

### Step 5: Done! 🎉
```
Your theme has been imported and applied!
Refresh the page to see the changes.
```

---

## 📋 What Gets Imported

### Colors
- ✅ Primary Color
- ✅ Secondary Color
- ✅ Background Color
- ✅ Text Color
- ✅ Success / Warning / Error Colors
- ✅ Border Color

### Typography
- ✅ Heading Font & Weight
- ✅ Body Font & Size
- ✅ Line Height
- ✅ Letter Spacing

### Layout
- ✅ Border Radius
- ✅ Shadow Effects

---

## 💡 Figma File Tips

### Best Naming for Auto-Detection

**Colors** - Use these names:
```
✅ Primary Color, Brand, Main
✅ Secondary, Accent
✅ Background, Surface
✅ Text, Foreground
✅ Success, Green
✅ Warning, Yellow
✅ Error, Red, Danger
```

**Typography** - Use these names:
```
✅ Heading, H1, Title
✅ Body, Paragraph, Text
```

### Recommended Structure
```
📁 Your Design File
  ├── 🎨 Design Tokens (Page)
  │   ├── Colors (Frame)
  │   └── Typography (Frame)
  └── 🧩 Components (Page)
```

---

## 🔧 Troubleshooting

### "Invalid token"
- ✅ Check token copied correctly
- ✅ Token starts with `figd_`
- ✅ Regenerate if expired

### "File not found"
- ✅ Check URL is correct
- ✅ You have access to file
- ✅ File isn't deleted

### "No tokens found"
- ✅ File has color/text styles
- ✅ Use recommended naming
- ✅ Create at least one style

---

## 🎯 Quick Test

### Test with sample Figma file:
```bash
cd server

# Set your token
export FIGMA_TOKEN="figd_xxxxxxxxxxxxx"
export FIGMA_FILE_URL="https://www.figma.com/file/ABC123/YourFile"

# Run test
node test_figma_import.js
```

Expected output:
```
🧪 Testing Figma Theme Importer
============================================================

1️⃣  Validating Figma access token...
   ✅ Token is valid
   User: yourname (you@example.com)

2️⃣  Extracting file key from URL...
   ✅ File key: ABC123

3️⃣  Importing theme from Figma...
   ✅ Import successful!

4️⃣  Import Metadata:
   File Name: MyDesign
   Last Modified: 2/17/2026, 10:30 AM
   Version: 1.2.3

5️⃣  Imported Theme:
   🎨 Colors:
      primaryColor       : #0f172a
      secondaryColor     : #64748b
      backgroundColor    : #ffffff
      ...

✅ Figma theme import test completed successfully!
```

---

## 📖 Full Documentation

For complete details, see:
- `docs/FIGMA_THEME_INTEGRATION.md` - Complete guide
- `FIGMA_INTEGRATION_SUMMARY.md` - Technical summary

---

## 🎬 Quick Demo

### Import Flow:
```
1. Click "Import from Figma"
   ↓
2. Enter URL + Token
   ↓
3. Click "Import"
   ↓
4. Preview Theme
   ↓
5. Apply Theme
   ↓
6. ✅ Done!
```

### Time: ~2 minutes

---

## ⚙️ API Usage (Advanced)

### Import via API:
```bash
curl -X POST http://localhost:3000/api/settings/theme/import/figma \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "figmaFileUrl": "https://www.figma.com/file/ABC123/MyDesign",
    "figmaAccessToken": "figd_xxxxxxxxxxxxx",
    "applyImmediately": false,
    "saveAsPreset": true,
    "presetName": "My Design System"
  }'
```

---

## 🔒 Security Notes

- ✅ Tokens **never stored** in database
- ✅ Used only during import
- ✅ HTTPS only
- ✅ Tenant-scoped access

---

## 📞 Need Help?

- Check: `docs/FIGMA_THEME_INTEGRATION.md`
- Test: `node server/test_figma_import.js`
- Figma Help: https://help.figma.com/hc/en-us/articles/8085703771159

---

**Last Updated**: February 17, 2026
**Version**: 1.0.0

🚀 **Happy Designing!**
