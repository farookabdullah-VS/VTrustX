# Export Module Architecture

## Overview
The Export Module provides comprehensive data export capabilities for RayiX survey responses, supporting multiple output formats and advanced filtering options.

## Features

### 1. Raw Data Export
- **Formats**: Excel (.xlsx), CSV (.csv)
- **Options**:
  - Single/Multiple header rows
  - Answer codes vs. answer values
  - Question codes vs. question text
  - Unselected checkboxes representation
  - Show/hide non-displayed questions
  - Report labels
  - Content URLs for upload questions
  - Geocoding and additional metadata

### 2. Charts & Analytics Export
- **Formats**: PowerPoint (.pptx, .ppt), Word (.docx), Excel (.xlsx)
- **Features**:
  - Multiple professional templates
  - Automated chart generation
  - Statistical summaries
  - Open-ended text data inclusion
  - Customizable branding

### 3. Statistical Package Export (SPSS)
- **Format**: SPSS (.sav) with syntax files
- **Options**:
  - Answer codes/values
  - Legacy export compatibility
  - Variable naming conventions
  - Question code mapping
  - Geocoding support

### 4. SQL Export
- **Format**: SQL dump files
- **Features**:
  - Complete data with scores and timestamps
  - Relational structure preservation
  - Easy database import

## Architecture

### Backend Structure
```
server/src/
├── api/routes/
│   └── exports.js              # Export API endpoints
├── services/
│   └── export/
│       ├── ExportService.js    # Main export orchestrator
│       ├── RawDataExporter.js  # Excel/CSV export
│       ├── AnalyticsExporter.js # Charts/Analytics
│       ├── SPSSExporter.js     # SPSS format
│       ├── SQLExporter.js      # SQL dump
│       └── DataTransformer.js  # Data processing utilities
└── utils/
    └── export/
        ├── ExcelBuilder.js     # Excel generation
        ├── ChartGenerator.js   # Chart creation
        └── TemplateEngine.js   # Template rendering
```

### Frontend Structure
```
client/src/
├── components/
│   ├── ExportModal.jsx         # Main export interface
│   ├── ExportOptions.jsx       # Export configuration
│   └── ExportProgress.jsx      # Progress indicator
└── services/
    └── exportService.js        # API client
```

## Data Flow

1. **User Request** → Frontend Export Modal
2. **Configuration** → User selects format, options, filters
3. **API Call** → POST /api/exports with configuration
4. **Data Retrieval** → Fetch submissions from database
5. **Filtering** → Apply date range, status, custom filters
6. **Transformation** → Process data based on options
7. **Generation** → Create file in requested format
8. **Response** → Stream file to user or provide download link

## Database Schema

### Export Jobs Table (for async exports)
```sql
CREATE TABLE export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    form_id UUID NOT NULL REFERENCES forms(id),
    user_id UUID NOT NULL REFERENCES users(id),
    export_type VARCHAR(50) NOT NULL, -- 'raw', 'analytics', 'spss', 'sql'
    format VARCHAR(20) NOT NULL, -- 'xlsx', 'csv', 'pptx', 'docx', 'sav', 'sql'
    options JSONB NOT NULL DEFAULT '{}',
    filters JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    file_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

## API Endpoints

### POST /api/exports/raw
Generate raw data export (Excel/CSV)

**Request Body:**
```json
{
  "formId": "uuid",
  "format": "xlsx|csv",
  "options": {
    "singleHeaderRow": true,
    "displayAnswerCodes": false,
    "displayAnswerValues": true,
    "questionCodes": false,
    "unselectedCheckboxes": "0",
    "showNotDisplayed": false,
    "reportLabels": true,
    "contentUrls": true,
    "geocode": false
  },
  "filters": {
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-01-31"
    },
    "status": "completed",
    "customFilters": []
  }
}
```

### POST /api/exports/analytics
Generate charts and analytics export

**Request Body:**
```json
{
  "formId": "uuid",
  "format": "pptx|ppt|docx|xlsx",
  "template": "QuestionPro/Blue",
  "includeOpenEnded": true,
  "filters": { ... }
}
```

### POST /api/exports/spss
Generate SPSS export

**Request Body:**
```json
{
  "formId": "uuid",
  "options": {
    "answerCodes": true,
    "answerValues": false,
    "legacyExport": false,
    "questionCodeVariableName": true,
    "questionCodeInsteadOfText": false,
    "showNotDisplayed": false,
    "unselectedCheckboxes": "0",
    "reportLabels": true,
    "includeOpenEnded": true,
    "geocode": false
  },
  "filters": { ... }
}
```

### POST /api/exports/sql
Generate SQL export

**Request Body:**
```json
{
  "formId": "uuid",
  "includeScores": true,
  "includeTimestamps": true,
  "filters": { ... }
}
```

### GET /api/exports/jobs/:id
Get export job status

### GET /api/exports/download/:jobId
Download completed export file

## Dependencies

### Backend
- `exceljs` - Excel file generation
- `json2csv` - CSV export
- `pptxgenjs` - PowerPoint generation
- `officegen` - Office document generation
- `chartjs-node-canvas` - Chart generation
- `archiver` - ZIP file creation
- `spss-writer` - SPSS file generation (or custom implementation)

### Frontend
- `react-dropzone` - File handling
- `axios` - API calls
- `react-query` - Data fetching and caching

## Security Considerations

1. **Authentication**: All export endpoints require valid JWT token
2. **Authorization**: Users can only export data from their tenant
3. **Rate Limiting**: Prevent abuse with rate limits
4. **File Size Limits**: Maximum export size restrictions
5. **Temporary Files**: Auto-cleanup of generated files after 24 hours
6. **Data Sanitization**: Prevent injection attacks in exported data

## Performance Optimization

1. **Async Processing**: Large exports processed in background
2. **Streaming**: Stream large files instead of loading into memory
3. **Caching**: Cache frequently requested exports
4. **Pagination**: Process data in chunks for large datasets
5. **Compression**: Compress large export files

## Future Enhancements

1. **Scheduled Exports**: Automated recurring exports
2. **Email Delivery**: Send exports via email
3. **Cloud Storage**: Save to Google Drive, Dropbox, etc.
4. **Custom Templates**: User-defined export templates
5. **Data Visualization**: Interactive dashboards in exports
6. **Multi-language Support**: Exports in multiple languages
7. **API Integration**: Export directly to third-party tools
