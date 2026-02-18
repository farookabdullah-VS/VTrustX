$ErrorActionPreference = "Stop"
$PROJECT_ID = "rayixcx"
$REGION = "me-central1"
$IMAGE = "gcr.io/$PROJECT_ID/rayix"
$SERVICE = "rayix-service"
$DB_INSTANCE = "rayixcx:me-central1:rayix"
Write-Host "Target DB Instance: $DB_INSTANCE"
$DB_PASS = "Yaalla@123" 
$DB_NAME = "rayix-db"

# Credentials from your local setup
$MS_ID = "d40891ff-4272-4b5f-a20b-aeb6e969c3d6"
$MS_SECRET = "Lz48Q~DGdBQ28R~5G2z8aVt~_EcJaxG8XK3clcj0"
$GO_ID = "913176322756-7eeltm3a2b3e4h9o8nkpf0guko9qj83n.apps.googleusercontent.com"
$GO_SECRET = "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"

# Workaround for Agent PAGER=cat issue on Windows
$env:PAGER = "more"

Write-Host "Starting Build and Deploy Process (Retry)..."

# 1. Build
Write-Host "Building Docker Image..."
# Use --quiet to avoid interactive prompts
# Increased timeout and machine type for heavier builds
gcloud builds submit --quiet --timeout=20m --machine-type=e2-highcpu-8 --project $PROJECT_ID --tag $IMAGE .
if ($LASTEXITCODE -ne 0) {
  Write-Error "Build failed with exit code $LASTEXITCODE"
}

# 2. Deploy
Write-Host "Deploying Service to Cloud Run..."
# Extract Gemini Key from .env safely
$GEMINI_KEY = (Get-Content .env | Select-String "GEMINI_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()

gcloud run deploy $SERVICE `
  --project $PROJECT_ID `
  --quiet `
  --image $IMAGE `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --add-cloudsql-instances $DB_INSTANCE `
  --set-env-vars INSTANCE_CONNECTION_NAME="$DB_INSTANCE" `
  --set-env-vars DB_HOST="127.0.0.1" `
  --set-env-vars DB_USER="postgres" `
  --set-env-vars DB_PASSWORD="$DB_PASS" `
  --set-env-vars DB_NAME="$DB_NAME" `
  --set-env-vars GOOGLE_CLIENT_ID="$GO_ID" `
  --set-env-vars GOOGLE_CLIENT_SECRET="$GO_SECRET" `
  --set-env-vars MICROSOFT_CLIENT_ID="$MS_ID" `
  --set-env-vars MICROSOFT_CLIENT_SECRET="$MS_SECRET" `
  --set-env-vars GEMINI_API_KEY="$GEMINI_KEY" `
  --set-env-vars JWT_SECRET=4a8138e0e88a5f5f479f7ec3c51f0c5a2c9438343725f3c19b48c037996c568acb9e18b8f36c5890e4f3a9e1451f201f8cfc26dc20399a4cd2bf2b04c0 `
  --set-env-vars DB_PORT="5432" `
  --set-env-vars AI_SERVICE_URL="https://rayix-ai-1072119297262.me-central1.run.app" `
  --set-env-vars NODE_ENV="production"

Write-Host "Deployment Command Sent. Check Cloud Console for URL."
