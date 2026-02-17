# Figma Font Integration - Quick Reference

⚡ **Everything you need to know about Figma fonts in 2 minutes**

---

## 🎯 Font Types (What Happens After Import)

### ✅ Google Fonts → Loads Automatically
```
Poppins, Inter, Roboto, Montserrat, etc.
→ Detected → Loaded from Google Fonts CDN → Ready!
```
**No action needed!**

### ✅ System Fonts → Works Immediately
```
Arial, Helvetica, Times New Roman, SF Pro, etc.
→ Detected → Uses OS font → Ready!
```
**No loading needed!**

### ⚠️ Custom Fonts → Manual Setup Required
```
YourBrandFont, PremiumFont, etc.
→ Not found → Instructions provided → You upload files
```
**Requires font file hosting!**

---

## 📋 Quick Decision Tree

```
Is your Figma font...
│
├─ On Google Fonts? (Check: fonts.google.com)
│  └─ ✅ Use it! Loads automatically
│
├─ A system font? (Arial, Helvetica, etc.)
│  └─ ✅ Use it! Works everywhere
│
└─ Custom/Premium font?
   └─ ⚠️ Either:
      • Upload font files to server
      • OR choose similar Google Font
```

---

## 🚀 Using Google Fonts (Recommended)

### Most Popular (Always Available):
```
Sans-serif:
• Roboto, Inter, Poppins, Montserrat
• Open Sans, Lato, Nunito, Work Sans
• Outfit, Raleway, DM Sans, Ubuntu

Serif:
• Playfair Display, Merriweather
• Lora, Crimson Text

Arabic:
• Cairo, Tajawal, Almarai, Amiri
```

### In Your Figma File:
1. Use text styles with these font names
2. Import theme → Fonts load automatically
3. Done!

---

## ⚙️ Custom Font Setup (3 Steps)

### Step 1: Get Font Files
```
Need: .woff2 (required) and .woff (fallback)
```

### Step 2: Upload to Server
```
/public/fonts/
  ├── MyFont-Regular.woff2
  └── MyFont-Bold.woff2
```

### Step 3: Add CSS
```css
@font-face {
  font-family: 'MyBrandFont';
  src: url('/fonts/MyFont-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

---

## 📊 After Import Preview

You'll see this:

```
┌──────────────────────────────────────┐
│ Heading Font        ✓ Google Fonts  │
│ Poppins → 'Poppins', sans-serif     │
│ The quick brown fox...               │
├──────────────────────────────────────┤
│ Body Font           ✓ System Font   │
│ Arial → Arial, Helvetica, sans-serif│
│ The quick brown fox...               │
├──────────────────────────────────────┤
│ Brand Font          ⚠ Custom Font   │
│ YourFont → 'YourFont', sans-serif   │
│ ⚠ Needs font files to be uploaded  │
└──────────────────────────────────────┘
```

**Legend:**
- ✓ Google Fonts = Auto-loads
- ✓ System Font = Ready to use
- ⚠ Custom Font = Manual setup needed

---

## 💡 Best Practices

### ✅ DO:
- Use Google Fonts when possible
- Load only 2-3 font weights
- Provide fallback fonts
- Use font-display: swap

### ❌ DON'T:
- Load 9 font weights (slow!)
- Use custom fonts without fallbacks
- Forget to upload font files for custom fonts

---

## 🔧 Troubleshooting

### Font Not Showing?

**Check 1:** Is it loaded?
```javascript
// In browser console
document.fonts.check('16px Poppins')
// true = loaded, false = not loaded
```

**Check 2:** Correct spelling?
```
✅ 'Poppins' (correct)
❌ 'Popins' (typo - won't load)
```

**Check 3:** Font files uploaded?
```
Custom fonts: Check /public/fonts/ folder
```

### Font Looks Different?

**Check weight:**
```css
/* Make sure weight matches */
font-family: 'Poppins', sans-serif;
font-weight: 600; /* ← Must be loaded */
```

---

## 📦 Files Created

### Backend:
- `server/src/services/FontLoader.js` - Font processing

### Frontend:
- `client/src/utils/fontLoader.js` - Dynamic font loading

### Documentation:
- `docs/FIGMA_FONT_INTEGRATION.md` - Complete guide

---

## 🎓 Examples

### Example 1: Google Fonts (Auto)
```
Figma: "Poppins", weight 600
   ↓
Import
   ↓
Result: Loads automatically ✅
```

### Example 2: System Font (Instant)
```
Figma: "Helvetica" or "SF Pro"
   ↓
Import
   ↓
Result: Works immediately ✅
```

### Example 3: Custom Font (Manual)
```
Figma: "YourBrandFont"
   ↓
Import
   ↓
Warning: Upload font files ⚠️
   ↓
Upload .woff2 files
   ↓
Add @font-face CSS
   ↓
Result: Works! ✅
```

---

## 🌍 Arabic Font Support

**Popular Google Fonts with Arabic:**
```
• Cairo (modern)
• Tajawal (professional)
• Almarai (elegant)
• Amiri (traditional)
```

**Usage:**
1. Use in Figma
2. Import theme
3. Fonts load automatically with Arabic support ✅

---

## ⚡ Performance Tips

```css
/* 1. Preconnect (done automatically) */
<link rel="preconnect" href="https://fonts.googleapis.com">

/* 2. Limit weights */
Load only: 400 (regular) and 700 (bold)

/* 3. Use font-display */
@font-face {
  font-display: swap; /* Shows text immediately */
}

/* 4. Fallbacks */
font-family: 'Poppins', Arial, sans-serif;
```

---

## 📞 Quick Help

### Need to check if font is on Google Fonts?
→ https://fonts.google.com

### Need to convert font files?
→ https://transfonter.org

### Need full documentation?
→ `docs/FIGMA_FONT_INTEGRATION.md`

---

## ✅ Summary

**Automatic (Most Cases):**
- ✅ Google Fonts load automatically
- ✅ System fonts work immediately
- ✅ Preview shows font examples
- ✅ Instructions provided

**Manual Setup (Rare):**
- ⚠️ Custom fonts need file upload
- ⚠️ Add @font-face CSS
- ⚠️ Or use Google Font alternative

**Result:**
- 🎨 Beautiful typography
- ⚡ Fast loading
- 💯 Professional appearance

---

**Time to Setup:**
- Google Fonts: 0 seconds ✅
- System Fonts: 0 seconds ✅
- Custom Fonts: 5-10 minutes ⚙️

**Last Updated**: February 17, 2026

🎉 **Fonts made easy!**
