# VTrustX Export Module

A comprehensive data export system for VTrustX survey responses with support for multiple formats and advanced filtering options.

![Export Module](https://img.shields.io/badge/Status-Production%20Ready-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)

## 📋 Features

### Export Formats

#### 1. **Raw Data Export**
- **Excel (.xlsx)** - Formatted workbooks with multiple sheets, styling, and metadata
- **CSV (.csv)** - Standard comma-separated values with UTF-8 BOM support

**Options:**
- Single/multiple header rows
- Answer codes vs. answer values
- Question codes vs. full text
- Unselected checkboxes representation
- Show/hide non-displayed questions
- Report labels and metadata
- Content URLs for upload questions
- Geocoding data

#### 2. **Charts & Analytics Export**
- **PowerPoint (.pptx, .ppt)** - Presentation slides with charts and statistics
- **Word (.docx)** - Formatted reports with tables and analysis
- **Excel (.xlsx)** - Analytics workbook with charts and pivot tables

**Features:**
- 13 professional templates
- Automated chart generation (pie, bar, line charts)
- Statistical summaries
- Response distribution analysis
- Open-ended text data inclusion

**Available Templates:**
- QuestionPro/Blue
- surveyanalyticsWhiteLabel
- Microsoft/Blends
- Microsoft/Pixel
- Microsoft/Fireworks
- Microsoft/Crayons
- Microsoft/Mountain Top
- Microsoft/Ocean
- Microsoft/Stream
- Microsoft/Globe
- Microsoft/Fading Grid
- Microsoft/Compass

#### 3. **Statistical Package Export (SPSS)**
- **SPSS (.sav)** - ZIP package with data and syntax files
- Complete variable definitions
- Value labels for categorical data
- Missing value specifications
- Import syntax for SPSS Statistics

**Options:**
- Answer codes/values
- Variable naming conventions
- Legacy export compatibility
- Question code mapping

#### 4. **SQL Export**
- Complete database dump with:
  - Form definitions
  - Submissions data
  - Response values with scores
  - Timestamps and metadata
  - Relational structure preservation

### Advanced Filtering

- **Date Range**: Filter by submission date
- **Response Status**: Completed, Partial, Terminated
- **Custom Filters**: Field-based filtering with operators
- **Data Cuts**: Up to 5 simultaneous filter conditions

## 🏗️ Architecture

```
Export Module
├── Backend (Node.js)
│   ├── Services
│   │   ├── ExportService.js          # Main orchestrator
│   │   ├── DataTransformer.js        # Data processing
│   │   ├── RawDataExporter.js        # Excel/CSV generation
│   │   ├── AnalyticsExporter.js      # Charts/Analytics
│   │   ├── SPSSExporter.js           # SPSS format
│   │   └── SQLExporter.js            # SQL dump
│   ├── Routes
│   │   └── exports.js                # API endpoints
│   └── Database
│       └── export_jobs table         # Job tracking
│
├── Frontend (React)
│   ├── Components
│   │   ├── ExportModal.jsx           # Main UI component
│   │   └── ExportModal.css           # Styling
│   └── Integration
│       └── ResultsViewer.jsx         # Integration point
│
└── Documentation
    ├── EXPORT_MODULE_ARCHITECTURE.md
    ├── EXPORT_MODULE_DEPENDENCIES.md
    └── EXPORT_MODULE_INTEGRATION.md
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd server
npm install exceljs json2csv pptxgenjs docx chartjs-node-canvas chart.js archiver
```

### 2. Run Database Migration

```bash
node scripts/create_export_jobs_table.js
```

### 3. Register Routes

In `server/src/index.js`:

```javascript
const exportsRouter = require('./api/routes/exports');
app.use('/api/exports', exportsRouter);
```

### 4. Create Exports Directory

```bash
mkdir -p server/exports
echo "exports/" >> .gitignore
```

### 5. Use in Your Application

```jsx
import ExportModal from './components/ExportModal';

function MyComponent() {
    const [showExport, setShowExport] = useState(false);
    
    return (
        <>
            <button onClick={() => setShowExport(true)}>
                Export Data
            </button>
            
            <ExportModal
                isOpen={showExport}
                onClose={() => setShowExport(false)}
                formId="form-uuid"
                formTitle="My Survey"
            />
        </>
    );
}
```

## 📊 Usage Examples

### Export Raw Data (Excel)

```javascript
const response = await fetch('/api/exports/raw', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        formId: 'abc123',
        format: 'xlsx',
        options: {
            singleHeaderRow: true,
            displayAnswerValues: true,
            questionCodes: false,
            reportLabels: true
        },
        filters: {
            dataset: 'custom',
            dateRange: {
                start: '2026-01-01',
                end: '2026-01-31'
            },
            status: 'completed'
        }
    })
});

const { jobId } = await response.json();
```

### Export Analytics (PowerPoint)

```javascript
const response = await fetch('/api/exports/analytics', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        formId: 'abc123',
        format: 'pptx',
        template: 'Microsoft/Ocean',
        includeOpenEnded: true,
        filters: { dataset: 'entire' }
    })
});
```

### Check Export Status

```javascript
const response = await fetch(`/api/exports/jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
});

const job = await response.json();
console.log(job.status); // 'pending', 'processing', 'completed', or 'failed'
```

### Download Export

```javascript
// Once status is 'completed'
window.location.href = `/api/exports/download/${jobId}`;
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/exports/raw` | POST | Create raw data export job |
| `/api/exports/analytics` | POST | Create analytics export job |
| `/api/exports/spss` | POST | Create SPSS export job |
| `/api/exports/sql` | POST | Create SQL export job |
| `/api/exports/jobs/:id` | GET | Get export job status |
| `/api/exports/download/:jobId` | GET | Download completed export |
| `/api/exports/history` | GET | Get user's export history |
| `/api/exports/jobs/:id` | DELETE | Delete export job |
| `/api/exports/cleanup` | POST | Trigger cleanup (admin) |

## 🎨 UI Components

### ExportModal Props

```typescript
interface ExportModalProps {
    isOpen: boolean;           // Controls modal visibility
    onClose: () => void;       // Close handler
    formId: string;            // Survey/Form ID
    formTitle: string;         // Display title
}
```

### Color Scheme (Matching VTrustX Design)

```css
Primary Blue: #00a8e8
Text Primary: #2c3e50
Text Secondary: #7f8c8d
Background: #fafbfc
Border: #e8e8e8
Success: #2e7d32
Error: #c62828
Info: #1565c0
```

## 🔒 Security

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Users can only export their tenant's data
- **Rate Limiting**: Recommended 10 exports per hour per user
- **File Cleanup**: Automatic deletion after 24 hours
- **Data Sanitization**: Prevents injection attacks in exports
- **Permissions**: Separate permissions for create, view, download

## ⚙️ Configuration

### Environment Variables

```env
# Export Settings
EXPORT_FILE_TTL=86400              # Time-to-live in seconds (24 hours)
EXPORT_MAX_RESPONSES=100000        # Maximum responses per export
EXPORT_TIMEOUT=300000              # Timeout in milliseconds (5 minutes)

# Storage (Optional - for cloud storage)
GCS_BUCKET_NAME=vtrustx-exports
AWS_S3_BUCKET=vtrustx-exports
```

### Cleanup Configuration

Set up automatic cleanup in `server/src/index.js`:

```javascript
const cron = require('node-cron');
const ExportService = require('./services/export/ExportService');

const exportService = new ExportService();

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    await exportService.cleanupOldExports(24);
});
```

## 📈 Performance

- **Small Exports** (<1000 responses): < 5 seconds
- **Medium Exports** (1000-10000 responses): 10-30 seconds
- **Large Exports** (10000+ responses): 30-120 seconds
- **Concurrent Jobs**: Supports multiple simultaneous exports
- **Memory Usage**: ~100MB per active export job

## 🧪 Testing

```javascript
// Test raw data export
npm run test:export:raw

// Test analytics export
npm run test:export:analytics

// Test SPSS export
npm run test:export:spss

// Test all export types
npm run test:export:all
```

## 🐛 Troubleshooting

### Common Issues

**1. Canvas Installation Errors (Windows)**
```bash
npm install --global windows-build-tools
npm rebuild canvas
```

**2. Memory Issues with Large Exports**
```bash
node --max-old-space-size=4096 server.js
```

**3. Export Job Stuck in Processing**
- Check server logs for errors
- Verify database connection
- Increase timeout configuration

**4. Charts Not Rendering**
- Ensure chartjs-node-canvas is installed
- Verify canvas dependencies
- Check for font issues on server

## 📦 Dependencies

### Required
- `exceljs` ^4.4.0 - Excel generation
- `json2csv` ^6.0.0 - CSV conversion
- `pptxgenjs` ^3.12.0 - PowerPoint creation
- `docx` ^8.5.0 - Word documents
- `chartjs-node-canvas` ^4.1.6 - Chart rendering
- `chart.js` ^4.4.1 - Chart configuration
- `archiver` ^6.0.1 - ZIP files

### Optional
- `@google-cloud/storage` - Cloud storage
- `node-cron` - Scheduled cleanup
- `bull` - Background job processing

## 🗺️ Roadmap

- [ ] Scheduled/recurring exports
- [ ] Email delivery of completed exports
- [ ] Custom export templates
- [ ] Multi-language support
- [ ] Export to Google Sheets/Drive
- [ ] Real-time progress tracking
- [ ] Export comparison tools
- [ ] Data visualization dashboards

## 📄 License

This module is part of VTrustX and follows the same license terms.

## 👥 Contributors

- Export Module Development Team
- VTrustX Core Team

## 📞 Support

- Documentation: `/docs/EXPORT_MODULE_*.md`
- Issues: Contact development team
- Feature Requests: Submit via project management system

---

**Built with ❤️ for VTrustX**

Last Updated: January 22, 2026
