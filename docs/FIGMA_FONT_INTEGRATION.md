# Figma Font Integration Guide

**Complete guide to importing and using fonts from Figma**

**Date**: February 17, 2026
**Status**: ✅ Complete and Ready

---

## Overview

When you import a theme from Figma, fonts are automatically processed and prepared for web use. This guide explains how the font integration works and how to handle different types of fonts.

---

## How It Works

### Automatic Font Processing

When you import from Figma, the system:

1. **Extracts font names** from your Figma file
2. **Identifies font type** (Google Fonts, System Font, or Custom)
3. **Prepares for web loading** (generates CSS, URLs)
4. **Loads fonts automatically** (for Google Fonts)
5. **Provides instructions** (for custom fonts)

### Font Types Detected

#### 1. Google Fonts ✅ (Best Option)
**Automatically loaded and ready to use**

Examples:
- Roboto, Inter, Poppins, Montserrat
- Open Sans, Lato, Raleway, Nunito
- Playfair Display, Merriweather
- Cairo, Tajawal (Arabic support)

**How it works**:
```
Figma Font → Detected on Google Fonts → Loaded automatically
```

**No configuration needed!**

#### 2. System Fonts ✅ (Always Available)
**Pre-installed on most devices**

Examples:
- Arial, Helvetica, Times New Roman
- Georgia, Verdana, Courier New
- Segoe UI, SF Pro, Roboto (OS defaults)

**How it works**:
```
Figma Font → Recognized as system font → Used directly
```

**No loading required!**

#### 3. Custom Fonts ⚠️ (Requires Setup)
**Fonts not available on Google Fonts or as system fonts**

Examples:
- Your company's custom brand font
- Purchased premium fonts
- Proprietary typefaces

**How it works**:
```
Figma Font → Not found → Instructions provided → Manual setup required
```

**Requires font file hosting!**

---

## Usage Examples

### Example 1: Google Fonts (Automatic)

**In Figma:**
- Set text style: "Poppins"
- Font weight: 600

**After Import:**
```javascript
{
  "headingFont": "'Poppins', sans-serif",
  "headingWeight": "600"
}
```

**Result:**
✅ Font loads automatically from Google Fonts
✅ All weights available
✅ No configuration needed

**Preview:**
<div style="font-family: 'Poppins'; font-weight: 600;">
This text uses Poppins 600
</div>

---

### Example 2: System Font (No Loading)

**In Figma:**
- Set text style: "SF Pro" or "Segoe UI"

**After Import:**
```javascript
{
  "headingFont": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
}
```

**Result:**
✅ Uses system font stack
✅ Matches OS design
✅ Zero loading time

---

### Example 3: Custom Font (Manual Setup)

**In Figma:**
- Set text style: "MyCompanyFont"

**After Import:**
```javascript
{
  "headingFont": "'MyCompanyFont', sans-serif",
  "warning": "This font needs to be hosted separately"
}
```

**Instructions provided:**
1. Upload font files to server
2. Add @font-face CSS rules
3. Or choose a similar Google Font

**Required Steps:** See [Custom Font Setup](#custom-font-setup) below

---

## Viewing Font Information

### In the Import Preview

After importing a theme, you'll see:

```
┌─────────────────────────────────────────────┐
│ Fonts                                       │
├─────────────────────────────────────────────┤
│ Heading Font              ✓ Google Fonts   │
│ Poppins → 'Poppins', sans-serif            │
│ The quick brown fox jumps over the lazy dog│
│                                             │
│ Body Font                 ✓ Google Fonts   │
│ Inter → 'Inter', sans-serif                │
│ The quick brown fox jumps over the lazy dog│
└─────────────────────────────────────────────┘

ℹ Font Loading:
  Heading Font:
    • This font is available on Google Fonts
    • It will load automatically
    • No additional configuration needed

  Body Font:
    • This font is available on Google Fonts
    • It will load automatically
    • No additional configuration needed
```

---

## Custom Font Setup

### Step 1: Get Font Files

You need the following formats:
- **WOFF2** (required, modern browsers)
- **WOFF** (fallback, older browsers)
- **TTF/OTF** (optional, legacy support)

### Step 2: Upload to Server

Upload fonts to your server:
```
/public/fonts/
  ├── MyFont-Regular.woff2
  ├── MyFont-Regular.woff
  ├── MyFont-Bold.woff2
  └── MyFont-Bold.woff
```

### Step 3: Add @font-face Rules

Add to your CSS or theme settings:

```css
@font-face {
  font-family: 'MyCompanyFont';
  src: url('/fonts/MyFont-Regular.woff2') format('woff2'),
       url('/fonts/MyFont-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'MyCompanyFont';
  src: url('/fonts/MyFont-Bold.woff2') format('woff2'),
       url('/fonts/MyFont-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

### Step 4: Use in Theme

Update theme with custom font:
```javascript
{
  "headingFont": "'MyCompanyFont', Arial, sans-serif",
  "headingWeight": "700"
}
```

---

## Best Practices

### 1. Prefer Google Fonts

**Advantages**:
- ✅ Free and instant loading
- ✅ CDN hosted (fast worldwide)
- ✅ No hosting required
- ✅ 1000+ font choices
- ✅ Optimized delivery

**How to use**:
- Choose from: https://fonts.google.com
- Use in Figma design
- Import automatically works

### 2. Use System Fonts for Performance

**Advantages**:
- ✅ Zero loading time
- ✅ Native OS appearance
- ✅ Always available
- ✅ Perfect for body text

**Recommended stacks**:
```css
/* Modern system font stack */
font-family: -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, Oxygen, Ubuntu,
             Cantarell, sans-serif;

/* Classic sans-serif */
font-family: Arial, Helvetica, sans-serif;

/* Classic serif */
font-family: Georgia, Times, serif;
```

### 3. Limit Font Weights

**Load only what you need**:
```javascript
// ✅ Good - 2 weights
weights: ['400', '700']

// ❌ Too many - 9 weights
weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
```

**Each weight adds ~20-40KB**

### 4. Use font-display: swap

**Prevents invisible text**:
```css
@font-face {
  font-family: 'MyFont';
  src: url('...') format('woff2');
  font-display: swap; /* ← Important! */
}
```

**Options**:
- `swap` - Show fallback immediately, swap when loaded
- `fallback` - Brief invisible period, then fallback
- `optional` - Use custom font only if cached

### 5. Provide Fallbacks

**Always include fallback fonts**:
```css
/* ✅ Good - has fallbacks */
font-family: 'Poppins', Arial, sans-serif;

/* ❌ Bad - no fallback */
font-family: 'Poppins';
```

---

## Arabic Font Support

### Google Fonts with Arabic

Popular Arabic-supporting fonts on Google Fonts:
- **Cairo** - Modern, clean
- **Tajawal** - Professional
- **Almarai** - Elegant
- **Amiri** - Traditional
- **Markazi Text** - Newspaper style
- **Noto Naskh Arabic** - Comprehensive

### Usage Example

**In Figma:**
- Use "Cairo" or "Tajawal"

**After Import:**
```javascript
{
  "headingFont": "'Cairo', sans-serif",
  "rtlMode": true,
  "arabicFontOptimization": true
}
```

**Result:**
✅ Loads from Google Fonts
✅ Full Arabic character support
✅ Diacritical marks included
✅ Right-to-left support

### Custom Arabic Fonts

If using custom Arabic fonts:
```css
@font-face {
  font-family: 'MyArabicFont';
  src: url('/fonts/MyArabicFont.woff2') format('woff2');
  unicode-range: U+0600-06FF, U+0750-077F, U+FE70-FEFF;
  font-display: swap;
}
```

---

## Troubleshooting

### Issue: Font Not Loading

**Check:**
1. Is it a Google Font? → Spelling must be exact
2. Is it a system font? → May not exist on all devices
3. Is it custom? → Font files uploaded and CSS added?

**Solution:**
```javascript
// Check loaded fonts
import fontLoader from '../utils/fontLoader';
console.log(fontLoader.getLoadedFonts());

// Wait for font
await fontLoader.waitForFont('Poppins');
```

### Issue: Font Looks Different

**Possible causes:**
- Wrong font weight selected
- Fallback font being used
- Font not fully loaded

**Solution:**
```css
/* Specify exact weight */
font-family: 'Poppins', sans-serif;
font-weight: 600; /* Must match loaded weight */
```

### Issue: Custom Font Warning

**Message:**
> "This font needs to be hosted separately"

**What it means:**
Font not available on Google Fonts or as system font

**Solutions:**
1. **Find alternative** on Google Fonts
2. **Upload font files** and add @font-face
3. **Use system font** as fallback

### Issue: Font Loading Slow

**Causes:**
- Too many font weights loaded
- Large font files
- Slow network

**Solutions:**
```javascript
// Preconnect to Google Fonts
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

// Load only needed weights
weights: ['400', '700'] // Just regular and bold
```

---

## API Reference

### Server-Side (Node.js)

#### FontLoader Service

```javascript
const fontLoader = require('./services/FontLoader');

// Process a Figma font
const fontConfig = await fontLoader.processFigmaFont('Poppins');

console.log(fontConfig);
// {
//   fontFamily: "'Poppins', sans-serif",
//   source: 'google-fonts',
//   loadMethod: 'link',
//   googleFontUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700',
//   fallback: 'Arial, Helvetica, sans-serif'
// }

// Generate CSS
const css = fontLoader.generateFontCSS(fontConfig);
// @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700');

// Generate HTML link
const html = fontLoader.generateFontLinkTag(fontConfig);
// <link href="..." rel="stylesheet">
```

### Client-Side (React)

#### Font Loader Utility

```javascript
import fontLoader from '../utils/fontLoader';

// Load a Google Font
fontLoader.loadGoogleFont('Poppins', ['400', '700']);

// Load from theme
fontLoader.loadThemeFonts(theme, fontConfigs);

// Check if loaded
if (fontLoader.isFontLoaded('Poppins')) {
  console.log('Font ready!');
}

// Wait for font
await fontLoader.waitForFont('Poppins', 3000);

// Load custom font
fontLoader.loadCustomFont('MyFont', '/fonts/MyFont.woff2', '400');
```

---

## Performance Optimization

### 1. Preconnect to Font Sources

Add to HTML <head>:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**(Done automatically by fontLoader)**

### 2. Subset Fonts

Load only needed characters:
```
https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&text=HelloWorld
```

### 3. Use Variable Fonts

Single file, multiple weights:
```css
@font-face {
  font-family: 'InterVariable';
  src: url('Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
}
```

### 4. Cache Font Files

Set long cache headers:
```nginx
location /fonts/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

---

## Examples

### Complete Theme with Fonts

```javascript
{
  // Colors
  "primaryColor": "#0f172a",
  "secondaryColor": "#64748b",
  "backgroundColor": "#ffffff",

  // Typography
  "headingFont": "'Poppins', sans-serif",
  "headingWeight": "700",
  "bodyFont": "'Inter', sans-serif",
  "fontSize": "16px",
  "bodyWeight": "400",
  "lineHeight": "1.6",

  // Layout
  "borderRadius": "12px"
}
```

### Font Configuration Response

```javascript
{
  "fonts": [
    {
      "name": "Heading Font",
      "original": "Poppins",
      "processed": "'Poppins', sans-serif",
      "config": {
        "fontFamily": "'Poppins', sans-serif",
        "source": "google-fonts",
        "loadMethod": "link",
        "googleFontUrl": "https://fonts.googleapis.com/css2?family=Poppins:wght@400;700",
        "weights": ["400", "700"],
        "fallback": "Arial, Helvetica, sans-serif"
      }
    }
  ],
  "fontInstructions": [
    {
      "font": "Heading Font",
      "source": "google-fonts",
      "fontFamily": "'Poppins', sans-serif",
      "autoLoad": true,
      "steps": [
        "This font is available on Google Fonts",
        "It will load automatically when you apply the theme",
        "No additional configuration needed"
      ]
    }
  ]
}
```

---

## Resources

### Google Fonts
- **Browse**: https://fonts.google.com
- **API Docs**: https://developers.google.com/fonts
- **GitHub**: https://github.com/google/fonts

### Font Tools
- **Font Squirrel**: https://www.fontsquirrel.com/tools/webfont-generator
- **Transfonter**: https://transfonter.org
- **FontForge**: https://fontforge.org

### Testing
- **Font Loading**: https://github.com/bramstein/fontfaceobserver
- **Performance**: https://web.dev/font-best-practices

---

## Summary

### ✅ Automatic (No Setup)
- Google Fonts (1000+ fonts)
- System fonts (OS defaults)

### ⚙️ Manual Setup Required
- Custom/premium fonts
- Company brand fonts

### 🎯 Best Practices
1. Prefer Google Fonts when possible
2. Limit font weights (2-3 max)
3. Use font-display: swap
4. Provide fallback fonts
5. Preconnect to font sources

### 🚀 Performance Tips
- Load only needed weights
- Use system fonts for body text
- Preconnect to Google Fonts
- Cache font files properly

---

**Files:**
- Service: `server/src/services/FontLoader.js`
- Utility: `client/src/utils/fontLoader.js`
- Integration: `server/src/services/FigmaThemeImporter.js`
- UI: `client/src/components/FigmaThemeImporter.jsx`

**Last Updated**: February 17, 2026
**Version**: 1.0.0

🎨 **Happy designing with fonts!**
