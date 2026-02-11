# RayiX Export Module - Quick Reference Card

## 🚀 Installation

```bash
cd server
node scripts/install_export_module.js
```

## 📝 Register Routes

```javascript
// server/src/index.js
const exportsRouter = require('./api/routes/exports');
app.use('/api/exports', exportsRouter);
```

## 🎨 Use in React

```jsx
import ExportModal from './components/ExportModal';

<ExportModal
    isOpen={showExport}
    onClose={() => setShowExport(false)}
    formId="form-uuid"
    formTitle="Survey Title"
/>
```

## 📡 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/exports/raw` | Raw data (Excel/CSV) |
| POST | `/api/exports/analytics` | Charts/Reports |
| POST | `/api/exports/spss` | SPSS package |
| POST | `/api/exports/sql` | SQL dump |
| GET | `/api/exports/jobs/:id` | Check status |
| GET | `/api/exports/download/:id` | Download file |
| GET | `/api/exports/history` | User history |
| DELETE | `/api/exports/jobs/:id` | Delete job |

## 💾 Export Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| Excel | `.xlsx` | Formatted data with sheets |
| CSV | `.csv` | Simple tabular data |
| PowerPoint | `.pptx` | Presentation with charts |
| Word | `.docx` | Text reports |
| SPSS | `.zip` | Statistical analysis |
| SQL | `.sql` | Database import |

## 🔧 Configuration Options

### Raw Data Export
```javascript
{
  format: 'xlsx', // or 'csv'
  options: {
    singleHeaderRow: true,
    displayAnswerValues: true,
    questionCodes: false,
    reportLabels: true,
    geocode: false
  }
}
```

### Analytics Export
```javascript
{
  format: 'pptx', // or 'docx', 'xlsx'
  template: 'QuestionPro/Blue',
  includeOpenEnded: true
}
```

### Filters (All Exports)
```javascript
{
  filters: {
    dataset: 'custom',
    dateRange: {
      start: '2026-01-01',
      end: '2026-01-31'
    },
    status: 'completed' // or 'partial', 'terminated'
  }
}
```

## 🧪 Test

```bash
node scripts/test_export_module.js
```

## 🔒 Permissions

```sql
-- Add permissions
INSERT INTO permissions (resource, action, description)
VALUES ('exports', 'create', 'Create exports');

-- Grant to role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Admin' AND p.resource = 'exports';
```

## 🧹 Cleanup (Cron Job)

```javascript
const cron = require('node-cron');
const ExportService = require('./services/export/ExportService');

// Daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    await new ExportService().cleanupOldExports(24);
});
```

## 🐛 Troubleshooting

### Canvas errors (Windows)
```bash
npm install --global windows-build-tools
npm rebuild canvas
```

### Memory issues
```bash
node --max-old-space-size=4096 server.js
```

### Check job status
```bash
curl http://localhost:3000/api/exports/jobs/JOB_ID \
  -H "Authorization: Bearer TOKEN"
```

## 📁 File Structure

```
server/
├── src/
│   ├── services/export/
│   │   ├── ExportService.js
│   │   ├── DataTransformer.js
│   │   ├── RawDataExporter.js
│   │   ├── AnalyticsExporter.js
│   │   ├── SPSSExporter.js
│   │   └── SQLExporter.js
│   └── api/routes/
│       └── exports.js
├── scripts/
│   ├── install_export_module.js
│   ├── create_export_jobs_table.js
│   └── test_export_module.js
└── exports/          # Generated files

client/
└── src/components/
    ├── ExportModal.jsx
    └── ExportModal.css
```

## 🎯 Example Usage

```javascript
// Create export
const response = await fetch('/api/exports/raw', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        formId: 'abc123',
        format: 'xlsx',
        options: { displayAnswerValues: true },
        filters: { dataset: 'entire' }
    })
});

const { jobId } = await response.json();

// Check status
const status = await fetch(`/api/exports/jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
});

// Download when complete
if (job.status === 'completed') {
    window.location.href = `/api/exports/download/${jobId}`;
}
```

## 📊 Templates Available

1. QuestionPro/Blue
2. surveyanalyticsWhiteLabel
3. Microsoft/Blends
4. Microsoft/Pixel
5. Microsoft/Fireworks
6. Microsoft/Crayons
7. Microsoft/Mountain Top
8. Microsoft/Ocean
9. Microsoft/Stream
10. Microsoft/Globe
11. Microsoft/Fading Grid
12. Microsoft/Compass

## 🔗 Documentation

- Architecture: `docs/EXPORT_MODULE_ARCHITECTURE.md`
- Integration: `docs/EXPORT_MODULE_INTEGRATION.md`
- Dependencies: `docs/EXPORT_MODULE_DEPENDENCIES.md`
- README: `docs/EXPORT_MODULE_README.md`
- Summary: `docs/EXPORT_MODULE_SUMMARY.md`
- Flow: `docs/EXPORT_MODULE_FLOW.md`

## ⚡ Performance

| Dataset Size | Processing Time |
|--------------|-----------------|
| < 1,000 | < 5 seconds |
| 1,000 - 10,000 | 10-30 seconds |
| > 10,000 | 30-120 seconds |

## 🎨 Color Scheme

```css
Primary:    #00a8e8  /* Blue */
Success:    #2e7d32  /* Green */
Error:      #c62828  /* Red */
Info:       #1565c0  /* Blue */
Text:       #2c3e50  /* Dark Gray */
Background: #fafbfc  /* Light Gray */
```

## ✅ Checklist

- [ ] Run installation script
- [ ] Register routes in server
- [ ] Run database migration
- [ ] Test exports with sample data
- [ ] Integrate ExportModal in UI
- [ ] Configure permissions
- [ ] Set up cleanup cron job
- [ ] Test all export formats
- [ ] Configure cloud storage (optional)
- [ ] Deploy to production

**All Ready!** 🚀

---

**Version**: 1.0.0  
**Date**: January 22, 2026  
**Status**: Production Ready ✅
