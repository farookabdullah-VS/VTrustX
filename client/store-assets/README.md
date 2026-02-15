# Play Store Assets

This directory contains assets for Google Play Store submission.

## Generated Assets

### 1. App Icon (app-icon.svg)
- **Size**: 512x512
- **Format**: SVG (convert to PNG for submission)
- **Design**: Green gradient with survey form icon and RX branding
- **Usage**: App icon in Play Store listing

### 2. Feature Graphic (feature-graphic.svg)
- **Size**: 1024x500
- **Format**: SVG (convert to PNG/JPG for submission)
- **Design**: Branded banner with app mockup and key features
- **Usage**: Main banner in Play Store

## Converting SVG to PNG

### Using Online Tools (Easiest)
1. Visit: https://cloudconvert.com/svg-to-png
2. Upload the SVG file
3. Set resolution:
   - App Icon: 512x512
   - Feature Graphic: 1024x500
4. Download PNG

### Using Inkscape (Free Desktop App)
```bash
# Install Inkscape: https://inkscape.org/

# Convert app icon
inkscape app-icon.svg --export-type=png --export-filename=app-icon.png --export-width=512 --export-height=512

# Convert feature graphic
inkscape feature-graphic.svg --export-type=png --export-filename=feature-graphic.png --export-width=1024 --export-height=500
```

### Using ImageMagick (Command Line)
```bash
# Install ImageMagick: https://imagemagick.org/

# Convert app icon
magick app-icon.svg -resize 512x512 app-icon.png

# Convert feature graphic
magick feature-graphic.svg -resize 1024x500 feature-graphic.png
```

## Screenshots

See `screenshot-guide.md` for instructions on capturing app screenshots.

## Customization

### Change Colors
Edit the SVG files and modify the gradient colors:
- Primary: `#10B981` (emerald green)
- Secondary: `#059669` (darker green)
- Accent: `#047857` (forest green)

### Change Text
Edit the feature graphic SVG:
- Line 53: App name
- Line 56: Tagline
- Lines 59-67: Feature bullets

### Professional Design Services
If you want professional graphics:
- **Fiverr**: $5-50 for app icons and graphics
- **99designs**: Design contests
- **Upwork**: Hire designers
- **Canva Pro**: DIY with templates
