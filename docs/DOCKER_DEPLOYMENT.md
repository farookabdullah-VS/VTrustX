## Docker Build & Cloud Run Deployment Guide

This document explains how to build Docker images and deploy RayiX to Google Cloud Run.

## Overview

The application uses Docker for containerization with two main images:
1. **Server Image**: Combined frontend (React) + backend (Express.js)
2. **AI Service Image**: Standalone AI processing service

## Docker Architecture

### Multi-Stage Build (Server)

The root `Dockerfile` uses a multi-stage build:

**Stage 1: Build React Frontend**
- Node.js 20 Alpine
- Install dependencies
- Build production bundle (`npm run build`)

**Stage 2: Setup Express Server**
- Node.js 20 Alpine
- Install system dependencies (canvas, sharp)
- Install server dependencies
- Copy server code
- Copy built frontend from Stage 1

**Result**: Single image with both frontend and backend

### AI Service Build

Simple single-stage build:
- Node.js 20 Alpine
- Install dependencies
- Copy source code
- Expose port 8080

## Local Docker Build

### Build Server Image

```bash
# Build
docker build -t rayix-server:latest .

# Run locally
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=rayix_db \
  -e JWT_SECRET=your-secret-key \
  -e ENCRYPTION_KEY=your-encryption-key-32-chars \
  rayix-server:latest
```

### Build AI Service Image

```bash
# Build
docker build -t rayix-ai-service:latest ./ai-service

# Run locally
docker run -p 3001:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=rayix_db \
  rayix-ai-service:latest
```

### Use Docker Compose

For local development with all services:

```bash
# Start all services (PostgreSQL, Redis, Server, AI Service)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## CI/CD Pipeline

### GitHub Actions Workflow

`.github/workflows/docker-build.yml` automatically builds and pushes images.

**Triggers:**
- Push to `main` branch
- Pull requests
- Manual workflow dispatch

**Jobs:**
1. **build-server**: Build and push server image
2. **build-ai-service**: Build and push AI service image
3. **deploy** (optional): Auto-deploy to Cloud Run

**Features:**
- ✅ Multi-platform builds (linux/amd64)
- ✅ Docker layer caching (GitHub Actions cache)
- ✅ Automatic tagging (branch, SHA, latest)
- ✅ Metadata labels
- ✅ Only pushes on `main` branch or manual trigger

### Image Tags

Images are tagged with:
- `latest` - Latest build from main branch
- `main-<sha>` - Specific commit SHA
- `pr-<number>` - Pull request builds

Example: `gcr.io/my-project/rayix-server:main-abc1234`

## Google Cloud Setup

### Prerequisites

1. **GCP Project**:
   ```bash
   gcloud projects create rayix-prod --name="RayiX Production"
   gcloud config set project rayix-prod
   ```

2. **Enable APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   ```

3. **Create Service Account**:
   ```bash
   # Create SA
   gcloud iam service-accounts create rayix-deployer \
     --display-name="RayiX Deployer"

   # Grant roles
   gcloud projects add-iam-policy-binding rayix-prod \
     --member="serviceAccount:rayix-deployer@rayix-prod.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding rayix-prod \
     --member="serviceAccount:rayix-deployer@rayix-prod.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding rayix-prod \
     --member="serviceAccount:rayix-deployer@rayix-prod.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"

   # Download key
   gcloud iam service-accounts keys create ~/rayix-deployer-key.json \
     --iam-account=rayix-deployer@rayix-prod.iam.gserviceaccount.com
   ```

4. **Configure GitHub Secrets**:
   ```
   GCP_PROJECT_ID: rayix-prod
   GCP_SA_KEY: <contents of rayix-deployer-key.json>
   ```

### Manual Deployment

#### Option 1: Deploy from Local Build

```bash
# Build and push
docker build -t gcr.io/rayix-prod/rayix-server:v1 .
docker push gcr.io/rayix-prod/rayix-server:v1

# Deploy to Cloud Run
gcloud run deploy rayix-server \
  --image gcr.io/rayix-prod/rayix-server:v1 \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production,PORT=8080"
```

#### Option 2: Deploy from GitHub

```bash
# Trigger manual workflow
# Go to GitHub Actions → Docker Build & Push → Run workflow

# Then deploy
gcloud run deploy rayix-server \
  --image gcr.io/rayix-prod/rayix-server:latest \
  --region us-central1
```

### Environment Variables

Set environment variables for Cloud Run:

```bash
gcloud run services update rayix-server \
  --region us-central1 \
  --set-env-vars="
    NODE_ENV=production,
    DB_HOST=10.0.0.3,
    DB_PORT=5432,
    DB_USER=rayix,
    DB_PASSWORD=secure-password,
    DB_NAME=rayix_prod,
    JWT_SECRET=your-jwt-secret-64-chars-minimum,
    JWT_REFRESH_SECRET=your-refresh-secret-64-chars,
    ENCRYPTION_KEY=your-encryption-key-32-chars,
    CSRF_SECRET=your-csrf-secret-32-chars,
    STORAGE_KEY=your-storage-key-32-chars,
    REDIS_URL=redis://10.0.0.4:6379,
    GCS_BUCKET_NAME=rayix-uploads-prod,
    SENTRY_DSN=https://your-sentry-dsn@sentry.io/project,
    FRONTEND_URL=https://rayix-server-xyz-uc.a.run.app
  "
```

### Database Setup

Use Cloud SQL for production:

```bash
# Create Cloud SQL instance
gcloud sql instances create rayix-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create rayix_prod \
  --instance=rayix-db

# Create user
gcloud sql users create rayix \
  --instance=rayix-db \
  --password=secure-password

# Connect Cloud Run to Cloud SQL
gcloud run services update rayix-server \
  --region us-central1 \
  --add-cloudsql-instances rayix-prod:us-central1:rayix-db \
  --set-env-vars="DB_HOST=/cloudsql/rayix-prod:us-central1:rayix-db"
```

### Redis Setup (Memorystore)

```bash
# Create Redis instance
gcloud redis instances create rayix-cache \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0

# Get IP
gcloud redis instances describe rayix-cache \
  --region=us-central1 \
  --format="value(host)"

# Update Cloud Run
gcloud run services update rayix-server \
  --region us-central1 \
  --set-env-vars="REDIS_URL=redis://10.0.0.4:6379"
```

### GCS Bucket Setup

```bash
# Create bucket
gsutil mb -c STANDARD -l us-central1 gs://rayix-uploads-prod/

# Set lifecycle rules (auto-delete exports after 90 days)
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

# Grant Cloud Run service account access
gcloud run services describe rayix-server \
  --region us-central1 \
  --format="value(spec.template.spec.serviceAccountName)"

gsutil iam ch serviceAccount:SA_EMAIL:roles/storage.objectAdmin gs://rayix-uploads-prod/
```

## Automated Deployment

Uncomment the `deploy` job in `.github/workflows/docker-build.yml` to enable auto-deployment on push to `main`.

**The deploy job will:**
1. Authenticate to GCP
2. Deploy server to Cloud Run
3. Deploy AI service to Cloud Run
4. Output deployment URLs

## Monitoring & Logs

### View Logs

```bash
# Server logs
gcloud run logs read rayix-server \
  --region us-central1 \
  --limit 50

# AI service logs
gcloud run logs read rayix-ai-service \
  --region us-central1 \
  --limit 50

# Stream logs (follow)
gcloud run logs tail rayix-server --region us-central1
```

### Metrics

View in Cloud Console:
- https://console.cloud.google.com/run
- Click on service → Metrics tab

**Key metrics:**
- Request count
- Request latency (P50, P95, P99)
- Error rate
- Memory usage
- CPU utilization
- Instance count

### Alerts

Set up alerts for:
- High error rate (> 1%)
- High latency (P95 > 1s)
- Low instance count (< 1)
- High memory usage (> 80%)

## Scaling Configuration

### Autoscaling

```bash
# Set min/max instances
gcloud run services update rayix-server \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 10

# Set CPU/memory
gcloud run services update rayix-server \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1
```

### Concurrency

```bash
# Max concurrent requests per instance
gcloud run services update rayix-server \
  --region us-central1 \
  --concurrency 80
```

## Cost Optimization

### Minimize Cold Starts

```bash
# Keep 1 instance always running
gcloud run services update rayix-server \
  --min-instances 1
```

Cost: ~$15/month for always-on instance

### Use Smaller Instance

```bash
# Reduce memory for AI service
gcloud run services update rayix-ai-service \
  --memory 512Mi
```

### Set Request Timeout

```bash
# Limit long-running requests
gcloud run services update rayix-server \
  --timeout 60
```

## Troubleshooting

### Build Fails

**Error**: `npm install` fails

**Solution**:
- Check `package-lock.json` is committed
- Verify Node.js version matches Dockerfile
- Check for platform-specific dependencies

### Container Crashes

**Error**: Container exits with code 1

**Solution**:
- Check logs: `gcloud run logs read rayix-server`
- Verify environment variables are set
- Ensure database is accessible
- Check memory limits

### Can't Connect to Database

**Error**: `ECONNREFUSED`

**Solution**:
- Verify Cloud SQL connection string
- Check VPC connector (if using private IP)
- Ensure Cloud SQL proxy is configured
- Test connection locally first

### High Latency

**Symptom**: Slow API responses

**Solution**:
- Scale up instances (--min-instances)
- Increase CPU/memory
- Enable Redis caching
- Use Cloud CDN for static assets
- Profile slow queries

## Security Best Practices

1. **Secrets Management**:
   - Use Secret Manager instead of env vars
   - Rotate secrets regularly
   - Never commit secrets to Git

2. **IAM Roles**:
   - Use least privilege principle
   - Separate dev/prod service accounts
   - Enable audit logging

3. **Network Security**:
   - Use VPC for database connections
   - Enable Cloud Armor (WAF)
   - Restrict ingress to HTTPS only

4. **Image Security**:
   - Scan images for vulnerabilities
   - Use minimal base images (Alpine)
   - Update dependencies regularly

## Further Reading

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [Memorystore for Redis](https://cloud.google.com/memorystore/docs/redis)
