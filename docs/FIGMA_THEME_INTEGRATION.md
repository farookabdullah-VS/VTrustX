# Figma Theme Integration Guide

**Status**: ✅ Complete and Ready to Use
**Date**: February 17, 2026

---

## Overview

The Figma Theme Integration allows you to import design tokens (colors, typography, spacing) directly from your Figma design files into VTrustX, automatically transforming them into application theme settings.

### Features

- ✅ Import colors, typography, and spacing from Figma
- ✅ Automatic mapping to application theme format
- ✅ Preview imported theme before applying
- ✅ Save as reusable theme presets
- ✅ Support for Figma Variables and Local Styles
- ✅ Secure token handling

---

## Quick Start

### 1. Get Your Figma Access Token

1. Go to https://www.figma.com/settings
2. Scroll to "Personal access tokens"
3. Click "Create a new personal access token"
4. Name it: "VTrustX Theme Import"
5. Copy the token (starts with `figd_`)

⚠️ **Important**: Store this token securely. You'll only see it once!

### 2. Prepare Your Figma File

Your Figma file should contain design tokens. Best practices:

**Option A: Use Figma Variables (Recommended)**
- Create color variables for primary, secondary, background, etc.
- Create text styles for headings and body text
- Organize in a frame named "Design Tokens"

**Option B: Use Local Styles**
- Create color styles: `Primary Color`, `Secondary Color`, etc.
- Create text styles: `Heading`, `Body`, etc.
- Create effect styles for shadows

**Option C: Named Frames**
- Create a page named "Colors" with color swatches
- Create a page named "Typography" with text examples
- Name components descriptively (e.g., "Button Primary")

### 3. Import Theme

1. Navigate to **Settings** → **Theme Settings**
2. Click "Import from Figma" button (top right)
3. Paste your Figma file URL
4. Paste your access token
5. Choose options:
   - ☑️ Apply immediately (optional)
   - ☑️ Save as preset (recommended)
6. Click "Import Theme"
7. Preview the imported theme
8. Click "Apply Theme"

Done! 🎉

---

## How It Works

### 1. Figma API Connection

The importer connects to Figma's REST API and fetches:
- File metadata
- Local styles (colors, text, effects)
- Document structure
- Component definitions

### 2. Design Token Extraction

The system extracts design tokens by:

**Colors**:
- Looking for color styles named: `primary`, `secondary`, `background`, `text`, `success`, `warning`, `error`
- Extracting from frames named "Colors" or "Palette"
- Finding color fills in design components

**Typography**:
- Text styles named: `heading`, `body`, `h1`, `paragraph`
- Font family, size, weight, line height, letter spacing
- Extracting from "Typography" or "Text Styles" frames

**Spacing**:
- Looking for spacing values in component layouts
- Extracting from "Spacing" or "Grid" frames

**Border Radius**:
- Extracting corner radius from button and card components

**Shadows**:
- Drop shadow effects from component styles

### 3. Transformation

Design tokens are mapped to application theme format:

```javascript
Figma Token → Application Theme
───────────────────────────────────
Primary Color → primaryColor
Secondary Color → secondaryColor
Background → backgroundColor
Text/Foreground → textColor
Success/Green → successColor
Warning/Yellow → warningColor
Error/Red → errorColor
Heading Font → headingFont, headingWeight
Body Font → bodyFont, fontSize, bodyWeight, lineHeight
Shadow → shadowColor
Border Radius → borderRadius
```

### 4. Application

The imported theme can be:
- **Previewed** before applying
- **Applied immediately** to your tenant
- **Saved as a preset** for reuse
- **Merged** with existing theme settings

---

## API Endpoints

### Import Theme

```http
POST /api/settings/theme/import/figma
Authorization: Bearer {token}
Content-Type: application/json

{
  "figmaFileUrl": "https://www.figma.com/file/ABC123/MyDesign",
  "figmaAccessToken": "figd_xxxxxxxxxxxxx",
  "applyImmediately": false,
  "saveAsPreset": true,
  "presetName": "My Design System"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "theme": {
    "primaryColor": "#0f172a",
    "secondaryColor": "#64748b",
    "backgroundColor": "#ffffff",
    "textColor": "#0f172a",
    "headingFont": "'Outfit', sans-serif",
    "fontSize": "16px",
    "borderRadius": "12px"
  },
  "metadata": {
    "fileName": "MyDesign",
    "lastModified": "2026-02-17T10:30:00Z",
    "version": "1.2.3",
    "importedAt": "2026-02-17T14:15:00Z"
  },
  "applied": false,
  "saved": true,
  "presetName": "My Design System"
}
```

### Validate Token

```http
POST /api/settings/theme/import/figma/validate
Authorization: Bearer {token}
Content-Type: application/json

{
  "figmaAccessToken": "figd_xxxxxxxxxxxxx"
}
```

**Response** (200 OK):
```json
{
  "valid": true,
  "user": {
    "id": "123456789",
    "handle": "username",
    "email": "user@example.com"
  }
}
```

---

## Figma File Structure Best Practices

### Recommended Structure

```
📁 MyDesignSystem (File)
├── 📄 Cover (Page)
├── 🎨 Design Tokens (Page)
│   ├── 🟦 Colors (Frame)
│   │   ├── Primary Color
│   │   ├── Secondary Color
│   │   ├── Background
│   │   ├── Text Color
│   │   ├── Success
│   │   ├── Warning
│   │   └── Error
│   ├── 🔤 Typography (Frame)
│   │   ├── Heading 1
│   │   ├── Heading 2
│   │   ├── Body
│   │   └── Caption
│   ├── 📏 Spacing (Frame)
│   │   ├── 8px
│   │   ├── 16px
│   │   ├── 24px
│   │   └── 32px
│   └── 🔲 Borders (Frame)
│       ├── Small (4px)
│       ├── Medium (8px)
│       └── Large (16px)
└── 🧩 Components (Page)
    ├── Button
    ├── Card
    └── Input
```

### Naming Conventions

**Colors** - Use these keywords:
- `primary`, `brand`, `main` → Primary Color
- `secondary`, `accent` → Secondary Color
- `background`, `bg`, `surface` → Background
- `text`, `foreground`, `fg` → Text Color
- `success`, `green` → Success Color
- `warning`, `yellow`, `amber` → Warning Color
- `error`, `danger`, `red` → Error Color
- `border`, `divider` → Border Color

**Typography** - Use these keywords:
- `heading`, `h1`, `title` → Heading Font
- `body`, `paragraph`, `text` → Body Font

**Components**:
- `button` → Button styles
- `card` → Card styles
- Name descriptively for better extraction

---

## Advanced Configuration

### Custom Token Mapping

If your Figma file uses different naming, you can customize the import:

```javascript
// In FigmaThemeImporter service
const options = {
  overrides: {
    primaryColor: '#custom-color',
    fontFamily: 'Custom Font'
  }
};

await importer.importTheme(fileKey, options);
```

### Partial Import

Import only specific tokens:

```javascript
// Import only colors
const result = await importer.importTheme(fileKey);
const colorsOnly = {
  primaryColor: result.theme.primaryColor,
  secondaryColor: result.theme.secondaryColor,
  backgroundColor: result.theme.backgroundColor
};
```

### Multiple Files

Import from multiple Figma files and merge:

```javascript
// Import colors from one file
const colorsResult = await importerColors.importTheme(colorsFileKey);

// Import typography from another file
const typographyResult = await importerTypography.importTheme(typographyFileKey);

// Merge
const mergedTheme = {
  ...colorsResult.theme,
  ...typographyResult.theme
};
```

---

## Troubleshooting

### Issue: "Invalid Figma access token"

**Solution:**
1. Verify token is copied correctly (starts with `figd_`)
2. Check token hasn't expired
3. Regenerate token in Figma settings

### Issue: "Figma file not found"

**Solution:**
1. Verify file URL is correct
2. Check you have access to the file
3. Make sure file isn't deleted or archived
4. Try viewing the file in Figma first

### Issue: "No design tokens found"

**Solution:**
1. Check file contains color/text styles
2. Verify frames are named correctly
3. Use "Design Tokens", "Colors", or "Typography" naming
4. Create at least one color style or variable

### Issue: "Colors not importing correctly"

**Solution:**
1. Use named color styles (not just fills)
2. Name colors with keywords: "Primary Color", "Brand Color", etc.
3. Avoid complex gradients (solid colors only)
4. Check color format is RGB (not HSL/HSV)

### Issue: "Fonts not available"

**Solution:**
1. Imported fonts must be web-safe or available via Google Fonts
2. Custom fonts need to be hosted separately
3. System fonts work best (Inter, Roboto, Arial, etc.)

---

## Security Considerations

### Token Storage

- ✅ Access tokens are **never stored** in the database
- ✅ Tokens are used only during import
- ✅ Transmitted over HTTPS only
- ✅ Not logged or cached

### Permissions

- ✅ Only authenticated users can import
- ✅ Themes scoped to tenant
- ✅ No cross-tenant access

### Best Practices

1. **Use Personal Access Tokens** (not OAuth tokens)
2. **Regenerate tokens periodically**
3. **Use separate tokens** for each application
4. **Don't commit tokens** to version control
5. **Revoke unused tokens** in Figma settings

---

## Examples

### Example 1: Simple Color Import

**Figma Setup:**
- Create color styles:
  - "Primary Color" = #0f172a
  - "Secondary Color" = #64748b
  - "Background" = #ffffff

**Result:**
```json
{
  "primaryColor": "#0f172a",
  "secondaryColor": "#64748b",
  "backgroundColor": "#ffffff"
}
```

### Example 2: Complete Design System

**Figma Setup:**
- Page: "Design Tokens"
  - Frame: "Colors" with 7 color styles
  - Frame: "Typography" with text styles
  - Components: Button, Card with border radius

**Result:**
```json
{
  "primaryColor": "#2563eb",
  "secondaryColor": "#64748b",
  "backgroundColor": "#ffffff",
  "textColor": "#0f172a",
  "successColor": "#10b981",
  "warningColor": "#f59e0b",
  "errorColor": "#ef4444",
  "headingFont": "'Poppins', sans-serif",
  "headingWeight": "700",
  "bodyFont": "'Inter', sans-serif",
  "fontSize": "16px",
  "bodyWeight": "400",
  "lineHeight": "1.6",
  "borderRadius": "12px"
}
```

### Example 3: Brand Guidelines

**Figma Setup:**
- Variables mode: "Light" and "Dark"
- Color variables with semantic names
- Text style collections

**Result:**
Automatically extracts light mode colors and creates a complete theme preset.

---

## Limitations

1. **Gradients**: Only solid colors supported (gradients ignored)
2. **Complex Effects**: Only drop shadows supported
3. **Images**: Background images not imported
4. **Animations**: Animation timings not imported
5. **Icons**: SVG icons not imported (use separate system)
6. **Components**: Only basic component props extracted

---

## Roadmap

Future enhancements planned:

- [ ] Support for Figma Variables API
- [ ] Dark mode theme extraction
- [ ] Multiple theme modes (light/dark)
- [ ] Component style extraction
- [ ] Icon library import
- [ ] Automatic sync (webhook-based)
- [ ] Version history tracking
- [ ] Bulk file import
- [ ] Team library support

---

## Testing

### Test Import

```bash
# Test with example file
curl -X POST http://localhost:3000/api/settings/theme/import/figma \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "figmaFileUrl": "https://www.figma.com/file/ABC123/TestDesign",
    "figmaAccessToken": "figd_xxxxxxxxxxxxx",
    "saveAsPreset": true,
    "presetName": "Test Import"
  }'
```

### Validate Token

```bash
curl -X POST http://localhost:3000/api/settings/theme/import/figma/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "figmaAccessToken": "figd_xxxxxxxxxxxxx"
  }'
```

---

## Support

### Resources

- **Figma API Docs**: https://www.figma.com/developers/api
- **Personal Access Tokens**: https://help.figma.com/hc/en-us/articles/8085703771159
- **Design Tokens**: https://www.figma.com/community/file/1108837363372588381

### Common Questions

**Q: Can I import from Figma Community files?**
A: Yes, if you have access to the file and it's not view-only.

**Q: Do I need a Figma Pro account?**
A: No, Personal Access Tokens work with free accounts.

**Q: How often can I import?**
A: No limits. Import as many times as needed.

**Q: Will this overwrite my existing theme?**
A: Only if you check "Apply immediately". Otherwise, it just creates a preview.

**Q: Can I import from FigJam files?**
A: No, only Figma design files supported.

---

## Files

**Backend:**
- `server/src/services/FigmaThemeImporter.js` - Core import service
- `server/src/api/routes/settings.js` - API endpoints (lines 1240-1400)

**Frontend:**
- `client/src/components/FigmaThemeImporter.jsx` - Import UI component
- `client/src/components/ThemeSettings.jsx` - Integration (lines 1-10, 247, 335-370, 1640-1665)

**Documentation:**
- `docs/FIGMA_THEME_INTEGRATION.md` - This file

---

**Last Updated**: February 17, 2026
**Status**: ✅ Production Ready
**Version**: 1.0.0
