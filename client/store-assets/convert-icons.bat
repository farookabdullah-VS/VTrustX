@echo off
REM Convert SVG icons to PNG for Play Store submission
REM Requires ImageMagick: https://imagemagick.org/

echo Converting app icon to PNG...
magick app-icon.svg -resize 512x512 app-icon.png
if %errorlevel% neq 0 (
    echo ERROR: ImageMagick not found. Please install from https://imagemagick.org/
    pause
    exit /b 1
)
echo ✓ app-icon.png created (512x512)

echo.
echo Converting feature graphic to PNG...
magick feature-graphic.svg -resize 1024x500 feature-graphic.png
echo ✓ feature-graphic.png created (1024x500)

echo.
echo ✓ All icons converted successfully!
echo.
echo Files created:
echo   - app-icon.png (512x512) - Upload to Play Console
echo   - feature-graphic.png (1024x500) - Upload to Play Console
echo.
echo Next: Capture app screenshots using screenshot-guide.md
pause
