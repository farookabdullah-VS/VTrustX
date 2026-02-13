# Google Cloud Storage (GCS) Migration Guide

This document explains the migration from local disk storage to Google Cloud Storage for file uploads and exports.

## Overview

The application now supports **both GCS (production) and local disk (development)** with automatic fallback:

- **GCS** (recommended for production): Shared storage across all Cloud Run instances, persistent and scalable
- **Local disk** (fallback): Works without GCS, suitable for single-instance development

## Why GCS?

### Problems with Local Disk Storage

1. **Ephemeral storage**: Files are lost when Cloud Run instances restart
2. **No shared state**: Each instance has its own filesystem, files not accessible across instances
3. **Limited space**: Cloud Run containers have limited disk space (/tmp)
4. **No backups**: Local files are not backed up automatically
5. **No CDN**: Cannot leverage GCS CDN for fast global delivery

### Benefits of GCS

1. **Persistent storage**: Files survive instance restarts and deployments
2. **Shared across instances**: All Cloud Run instances access the same files
3. **Scalable**: Virtually unlimited storage capacity
4. **Automatic backups**: Built-in versioning and lifecycle management
5. **CDN integration**: Fast global delivery with Cloud CDN
6. **Signed URLs**: Secure, time-limited access to private files
7. **Cost-effective**: Pay only for what you use (~$0.02/GB/month)

## Architecture

### Storage Service

The `StorageService` class abstracts storage operations:

**Features:**
- ✅ **Dual-mode**: GCS (production) + local disk (development)
- ✅ **Automatic fallback**: Gracefully handles GCS initialization failures
- ✅ **Encryption**: All files encrypted at rest (AES-256-CBC)
- ✅ **Image compression**: Automatic compression for images (max 1920x1080, 80% quality)
- ✅ **Signed URLs**: Secure file access with expiration (GCS only)
- ✅ **Backward compatible**: Same interface as old fileStorage.js

### File Types

Two categories of files:

1. **User Uploads** (encrypted)
   - Profile images, attachments, form uploads
   - Encrypted before upload to GCS
   - Served through `/api/files/:filename` (decrypted on-the-fly)
   - Stored as: `{timestamp}-{random}-{filename}.enc`

2. **Export Files** (unencrypted)
   - CSV, Excel, PDF, SPSS exports
   - Stored unencrypted for direct download
   - Served via signed URLs (GCS) or `/api/exports/download/:jobId` (local)
   - Stored as: `exports/{jobId}_{filename}`

## Setup

### Local Development (without GCS)

Files are automatically stored locally:

```bash
# No configuration needed
npm run dev --prefix server
```

Files stored in:
- Uploads: `server/uploads/`
- Exports: `server/exports/`

### Local Development (with GCS)

Test GCS integration locally:

1. **Create service account:**

   ```bash
   gcloud iam service-accounts create rayix-storage \
     --display-name="RayiX Storage Service Account"
   ```

2. **Grant Storage Admin role:**

   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:rayix-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   ```

3. **Download service account key:**

   ```bash
   gcloud iam service-accounts keys create ~/rayix-sa-key.json \
     --iam-account=rayix-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Configure environment:**

   Add to `server/.env`:
   ```env
   GCS_BUCKET_NAME=rayix-uploads
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/rayix-sa-key.json
   ```

5. **Create GCS bucket:**

   ```bash
   gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://rayix-uploads/
   ```

### Production (Cloud Run)

Cloud Run uses **Application Default Credentials** automatically (no service account key needed).

1. **Create GCS bucket:**

   ```bash
   # Create bucket
   gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://rayix-uploads-prod/

   # Enable versioning (optional, for backups)
   gsutil versioning set on gs://rayix-uploads-prod/

   # Set lifecycle rules (optional, auto-delete old files)
   cat > lifecycle.json <<EOF
   {
     "lifecycle": {
       "rule": [
         {
           "action": {"type": "Delete"},
           "condition": {"age": 90, "matchesPrefix": ["exports/"]}
         }
       ]
     }
   }
   EOF
   gsutil lifecycle set lifecycle.json gs://rayix-uploads-prod/
   ```

2. **Grant Cloud Run service account access:**

   ```bash
   # Get Cloud Run service account email
   gcloud run services describe rayix-server --region=us-central1 --format="value(spec.template.spec.serviceAccountName)"

   # Grant Storage Object Admin role
   gsutil iam ch serviceAccount:YOUR-SA@YOUR_PROJECT_ID.iam.gserviceaccount.com:roles/storage.objectAdmin gs://rayix-uploads-prod/
   ```

3. **Update Cloud Run environment:**

   ```bash
   gcloud run services update rayix-server \
     --region=us-central1 \
     --set-env-vars="GCS_BUCKET_NAME=rayix-uploads-prod"
   ```

## API

### StorageService

Located at: `server/src/infrastructure/storage/StorageService.js`

```javascript
const storageService = require('./infrastructure/storage/StorageService');

// Process and save file (multer file object)
const result = await storageService.processAndSave(file);
// Returns: { filename, originalName, mimetype, size, path, storageType }

// Retrieve and decrypt file
const buffer = await storageService.retrieveAndDecrypt(filename);

// Delete file
await storageService.deleteFile(filename);

// Get signed URL (GCS only, returns API path for local)
const url = await storageService.getSignedUrl(filename, 3600); // 1 hour

// Get storage type
const type = storageService.getStorageType(); // 'gcs' or 'local'
```

### Backward-Compatible Wrapper

Located at: `server/src/core/fileStorage.js`

```javascript
const { processAndSave, retrieveAndDecrypt, deleteFile, getSignedUrl } = require('./core/fileStorage');

// Same API as before
const result = await processAndSave(multerFile);
const buffer = await retrieveAndDecrypt(filename);
await deleteFile(filename);
const url = await getSignedUrl(filename);
```

## File Flow

### Upload Flow

1. **Client** sends file via `/api/files/upload`
2. **Multer** parses multipart form data, stores in memory
3. **StorageService**:
   - Compresses image if applicable (Sharp)
   - Encrypts buffer (AES-256-CBC)
   - Uploads to GCS or saves locally
4. **API** returns file metadata with virtual path

### Download Flow

1. **Client** requests `/api/files/:filename`
2. **StorageService**:
   - Downloads from GCS or reads from local disk
   - Decrypts buffer
3. **API** streams decrypted file to client

### Export Flow

1. **User** requests export
2. **ExportService**:
   - Generates export file (CSV, Excel, etc.)
   - Saves to GCS or local disk (unencrypted)
   - For GCS: generates signed URL (7 days expiration)
3. **API** returns download URL

## Security

### Encryption

- **User uploads**: Encrypted at rest with AES-256-CBC
- **Export files**: Stored unencrypted (temporary, auto-deleted after 90 days)
- **Encryption key**: Set via `STORAGE_KEY` env var (32 characters)

### Access Control

- **User uploads**: Require authentication, decrypted on-the-fly
- **Export files (GCS)**: Signed URLs with expiration (7 days)
- **Export files (local)**: Served through authenticated endpoint

### Best Practices

1. **Rotate encryption key** periodically
2. **Set bucket lifecycle rules** to auto-delete old exports
3. **Enable versioning** for important files
4. **Use signed URLs** instead of public URLs
5. **Set CORS policies** if serving files to frontend

## Migration Checklist

✅ **Completed:**

- [x] Install `@google-cloud/storage`
- [x] Create `StorageService` with GCS support
- [x] Add automatic fallback to local storage
- [x] Update `fileStorage.js` to use `StorageService`
- [x] Update `ExportService` to use GCS for exports
- [x] Maintain encryption for user uploads
- [x] Add signed URL support
- [x] Update `.env.example` with `GCS_BUCKET_NAME`
- [x] All tests passing (226/226)
- [x] Create documentation

**Not migrated** (still on local disk):
- Static React build (`client/dist/`) - served via Cloud Run container
- Temporary files in `/tmp` - ephemeral by design

## Testing

### Manual Testing

1. **Test local storage** (default):
   ```bash
   # Don't set GCS_BUCKET_NAME
   npm run dev --prefix server
   curl -F "file=@test.png" http://localhost:3000/api/files/upload
   ```

2. **Test GCS**:
   ```bash
   export GCS_BUCKET_NAME=rayix-uploads
   export GOOGLE_APPLICATION_CREDENTIALS=~/rayix-sa-key.json
   npm run dev --prefix server
   curl -F "file=@test.png" http://localhost:3000/api/files/upload
   ```

3. **Verify in GCS**:
   ```bash
   gsutil ls gs://rayix-uploads/
   ```

### Unit Tests

All existing tests pass (226/226). Tests use local storage by default (no GCS configuration).

### Integration Testing

Test checklist:
- [ ] Upload file (image, PDF, CSV)
- [ ] Download file
- [ ] Delete file
- [ ] Create export job
- [ ] Download export
- [ ] Verify signed URLs (GCS only)
- [ ] Test with multiple instances (Cloud Run)

## Monitoring

### Metrics to Track

**Storage metrics:**
- Total storage size (GB)
- Number of files
- Upload/download bandwidth
- Storage costs

**GCS-specific:**
- Request count (class A, B)
- Signed URL generation rate
- Failed uploads/downloads

### GCS Monitoring

```bash
# List all files
gsutil ls -r gs://rayix-uploads/

# Get bucket size
gsutil du -s gs://rayix-uploads/

# Monitor requests (last 7 days)
gcloud logging read "resource.type=gcs_bucket AND resource.labels.bucket_name=rayix-uploads" \
  --limit 50 \
  --format json \
  --freshness=7d
```

## Troubleshooting

### GCS initialization fails

**Symptom**: Logs show "Failed to initialize GCS, falling back to local storage"

**Solutions**:
1. Check `GCS_BUCKET_NAME` is set correctly
2. Verify bucket exists: `gsutil ls gs://YOUR_BUCKET/`
3. Check service account permissions:
   ```bash
   gsutil iam get gs://YOUR_BUCKET/
   ```
4. For local dev, check `GOOGLE_APPLICATION_CREDENTIALS` points to valid key file

### Files not accessible across instances

**Symptom**: Files uploaded to one instance not visible on another

**Solutions**:
1. Ensure `GCS_BUCKET_NAME` is set (not using local storage)
2. Verify all instances use same bucket
3. Check storage type in logs: should see "GCS Storage initialized"

### Signed URLs not working

**Symptom**: Signed URL returns 403 Forbidden

**Solutions**:
1. Check service account has `storage.objects.get` permission
2. Verify URL not expired
3. Check bucket permissions:
   ```bash
   gsutil iam get gs://YOUR_BUCKET/
   ```
4. Ensure uniform bucket-level access is enabled (recommended)

### High storage costs

**Symptom**: Unexpected GCS charges

**Solutions**:
1. Set lifecycle rules to delete old exports:
   ```bash
   gsutil lifecycle set lifecycle.json gs://YOUR_BUCKET/
   ```
2. Use Standard storage class (not Nearline/Coldline)
3. Monitor request counts (class A operations are expensive)
4. Consider compressing exports before upload

## Cost Optimization

### Pricing Overview (us-central1)

- **Storage**: $0.020/GB/month
- **Class A operations** (write, list): $0.05/10,000 ops
- **Class B operations** (read): $0.004/10,000 ops
- **Egress** (to internet): $0.12/GB (first 1GB free)

### Optimization Tips

1. **Use lifecycle rules**: Auto-delete exports after 90 days
2. **Compress images**: Already done (Sharp compression)
3. **Minimize list operations**: Cache file metadata in database
4. **Use signed URLs**: Avoid proxying downloads through server
5. **Enable CDN**: Use Cloud CDN for frequently accessed files

### Cost Calculator

```bash
# Example: 10,000 uploads/month, 1GB total storage, 50,000 downloads/month
# Storage: 1 GB × $0.020 = $0.02
# Uploads: 10,000 × $0.05/10,000 = $0.05
# Downloads: 50,000 × $0.004/10,000 = $0.02
# Total: ~$0.09/month
```

## Further Reading

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Best Practices](https://cloud.google.com/storage/docs/best-practices)
