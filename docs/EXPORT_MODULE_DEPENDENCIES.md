# Export Module - Required Dependencies

## Backend Dependencies (server/package.json)

Add the following npm packages to your server's `package.json`:

```json
{
  "dependencies": {
    "exceljs": "^4.4.0",
    "json2csv": "^6.0.0",
    "pptxgenjs": "^3.12.0",
    "docx": "^8.5.0",
    "chartjs-node-canvas": "^4.1.6",
    "chart.js": "^4.4.1",
    "archiver": "^6.0.1"
  }
}
```

## Installation Commands

### Install Backend Dependencies
```bash
cd server
npm install exceljs json2csv pptxgenjs docx chartjs-node-canvas chart.js archiver
```

### Frontend Dependencies
All frontend dependencies are already included in React (no additional packages needed).

## Dependency Details

### exceljs (^4.4.0)
- **Purpose**: Excel file generation (.xlsx)
- **Usage**: Creates formatted Excel workbooks with multiple sheets, styling, and formulas
- **License**: MIT

### json2csv (^6.0.0)
- **Purpose**: CSV file generation
- **Usage**: Converts JSON data to CSV format with custom delimiters and headers
- **License**: MIT

### pptxgenjs (^3.12.0)
- **Purpose**: PowerPoint presentation generation (.pptx)
- **Usage**: Creates PowerPoint slides with charts, tables, and formatted content
- **License**: MIT

### docx (^8.5.0)
- **Purpose**: Word document generation (.docx)
- **Usage**: Creates Word documents with formatted text, tables, and images
- **License**: MIT

### chartjs-node-canvas (^4.1.6)
- **Purpose**: Server-side chart rendering
- **Usage**: Renders Chart.js charts to PNG images for embedding in exports
- **License**: MIT

### chart.js (^4.4.1)
- **Purpose**: Chart configuration
- **Usage**: Provides chart configuration for rendering statistical visualizations
- **License**: MIT

### archiver (^6.0.1)
- **Purpose**: ZIP file creation
- **Usage**: Creates ZIP archives for SPSS export packages
- **License**: MIT

## Optional Dependencies

For production deployments, consider adding:

```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.7.0"
  }
}
```

This allows storing export files in Google Cloud Storage instead of local filesystem.

## Post-Installation Steps

1. **Create exports directory**:
   ```bash
   mkdir -p server/exports
   ```

2. **Add to .gitignore**:
   ```
   exports/
   /exports/
   ```

3. **Configure cleanup cron job** (optional):
   Set up a periodic cleanup of old export files to prevent disk space issues.

## Troubleshooting

### Canvas Issues (chartjs-node-canvas)
If you encounter issues with canvas installation on Windows:

```bash
npm install --global windows-build-tools
npm install canvas --build-from-source
```

### Memory Issues with Large Exports
Increase Node.js memory limit:

```bash
node --max-old-space-size=4096 server.js
```

## Verification

After installation, verify all packages are installed:

```bash
npm list exceljs json2csv pptxgenjs docx chartjs-node-canvas chart.js archiver
```

All packages should show their version numbers without errors.
