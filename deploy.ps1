$PROJECT_ID = "vtrustx"
$REGION = "us-central1"
$IMAGE = "gcr.io/$PROJECT_ID/vtrustx"
$SERVICE = "vtrustx-service"
$DB_INSTANCE = "${PROJECT_ID}:${REGION}:vtrustx"
$DB_PASS = "VTrustX@2030" 
$DB_NAME = "vtrustx-db"

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
gcloud builds submit --quiet --tag $IMAGE .

# 2. Deploy
Write-Host "Deploying Service to Cloud Run..."
# Extract Gemini Key from .env safely
$GEMINI_KEY = (Get-Content .env | Select-String "GEMINI_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1] }).Trim()

gcloud run deploy $SERVICE `
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
  --set-env-vars DB_PORT="5432" `
  --set-env-vars NODE_ENV="production"

Write-Host "Deployment Command Sent. Check Cloud Console for URL."
