# Export Module Integration Guide

## Overview
This guide walks you through integrating the Export Module into your RayiX application.

## Step 1: Install Dependencies

```bash
cd server
npm install exceljs json2csv pptxgenjs docx chartjs-node-canvas chart.js archiver
```

## Step 2: Run Database Migration

Create the `export_jobs` table:

```bash
node scripts/create_export_jobs_table.js
```

Verify the table was created:
```sql
SELECT * FROM export_jobs LIMIT 1;
```

## Step 3: Register Export Routes

Update `server/src/index.js` or `server/src/app.js` to register the export routes:

```javascript
// Add this import
const exportsRouter = require('./api/routes/exports');

// Register the route (after other routes)
app.use('/api/exports', exportsRouter);
```

## Step 4: Create Exports Directory

```bash
# From project root
mkdir -p server/exports
```

Add to `.gitignore`:
```
exports/
*.xlsx
*.csv
*.pptx
*.docx
*.zip
*.sql
```

## Step 5: Configure Permissions

Ensure the permissions table includes export permissions:

```sql
-- Add export permission if not exists
INSERT INTO permissions (resource, action, description)
VALUES 
    ('exports', 'create', 'Create export jobs'),
    ('exports', 'view', 'View export history'),
    ('exports', 'download', 'Download export files')
ON CONFLICT DO NOTHING;
```

Grant permissions to appropriate roles:

```sql
-- Grant to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin' AND p.resource = 'exports';
```

## Step 6: Integrate Export Modal in ResultsViewer

Update `client/src/components/ResultsViewer.jsx`:

```javascript
import React, { useState } from 'react';
import ExportModal from './ExportModal';

const ResultsViewer = ({ formId, formTitle }) => {
    const [showExportModal, setShowExportModal] = useState(false);

    return (
        <div>
            {/* Your existing results view */}
            
            {/* Add Export Button */}
            <button 
                className="btn-primary"
                onClick={() => setShowExportModal(true)}
            >
                <i className="fas fa-download"></i> Export Data
            </button>

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                formId={formId}
                formTitle={formTitle}
            />
        </div>
    );
};

export default ResultsViewer;
```

Or integrate into FormBuilder or Dashboard as needed.

## Step 7: Test Export Functionality

### Test Raw Data Export

```javascript
// Test via API
const response = await fetch('/api/exports/raw', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        formId: 'your-form-id',
        format: 'xlsx',
        options: {
            singleHeaderRow: true,
            displayAnswerValues: true
        },
        filters: {
            dataset: 'entire'
        }
    })
});

const result = await response.json();
console.log('Export Job ID:', result.jobId);
```

### Check Export Status

```javascript
const jobStatus = await fetch(`/api/exports/jobs/${jobId}`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const job = await jobStatus.json();
console.log('Status:', job.status);
```

### Download Export

```javascript
// Once completed
window.location.href = `/api/exports/download/${jobId}`;
```

## Step 8: Set Up Cleanup Cron Job (Production)

Create a cron job to clean up old exports:

**Using node-cron** (recommended):

1. Install node-cron:
```bash
npm install node-cron
```

2. Add to `server/src/index.js`:
```javascript
const cron = require('node-cron');
const ExportService = require('./services/export/ExportService');

const exportService = new ExportService();

// Run cleanup daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    console.log('Running export cleanup...');
    try {
        await exportService.cleanupOldExports(24); // Delete files older than 24 hours
        console.log('Export cleanup completed');
    } catch (error) {
        console.error('Export cleanup failed:', error);
    }
});
```

**Using system cron** (alternative):

Create `cleanup-exports.js`:
```javascript
const ExportService = require('./src/services/export/ExportService');

const exportService = new ExportService();

exportService.cleanupOldExports(24)
    .then(() => {
        console.log('Cleanup completed');
        process.exit(0);
    })
    .catch(err => {
        console.error('Cleanup failed:', err);
        process.exit(1);
    });
```

Add to crontab:
```bash
0 2 * * * cd /path/to/server && node cleanup-exports.js
```

## Step 9: Configure Cloud Storage (Optional - Production)

For production, it's recommended to store exports in cloud storage instead of local filesystem.

### Google Cloud Storage Integration

1. Install Google Cloud Storage client:
```bash
npm install @google-cloud/storage
```

2. Update `ExportService.js` `saveExportFile` method:
```javascript
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

async saveExportFile(jobId, fileName, buffer) {
    const file = bucket.file(`exports/${jobId}_${fileName}`);
    
    await file.save(buffer, {
        metadata: {
            contentType: this.getContentType(fileName)
        }
    });

    // Generate signed URL (valid for 1 hour)
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 3600000
    });

    return url;
}
```

## Step 10: Monitor and Optimize

### Add Logging
```javascript
// In ExportService.js
console.log(`Export job ${jobId} started for form ${formId}`);
console.log(`Export job ${jobId} completed in ${duration}ms`);
```

### Monitor Performance
- Track export job completion times
- Monitor disk space usage
- Set up alerts for failed exports

### Optimize Large Exports
- Implement pagination for very large datasets
- Use streaming for file generation
- Consider background job processing (Bull, BullMQ)

## Troubleshooting

### Issue: Export Job Stuck in "Processing"
**Solution**: Check server logs, increase timeout, verify database connection

### Issue: Large Files Causing Memory Issues
**Solution**: Implement streaming exports, increase Node.js memory limit

### Issue: Charts Not Rendering
**Solution**: Ensure canvas dependencies are installed correctly

### Issue: Permission Denied Errors
**Solution**: Verify export permissions are configured correctly

## Security Considerations

1. **Authentication**: All export endpoints require valid JWT token
2. **Authorization**: Users can only export data from their tenant
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **File Cleanup**: Automatically delete old exports to prevent data leaks
5. **Sensitive Data**: Ensure exports don't include sensitive user information unless authorized

## Next Steps

1. Customize export templates to match your branding
2. Add custom export formats specific to your use case
3. Implement scheduled/recurring exports
4. Add email delivery for completed exports
5. Create export presets for common configurations
6. Add export analytics and usage tracking

## Support

For issues or questions:
- Check the [Architecture Documentation](./EXPORT_MODULE_ARCHITECTURE.md)
- Review the [Dependencies Guide](./EXPORT_MODULE_DEPENDENCIES.md)
- Contact the development team
