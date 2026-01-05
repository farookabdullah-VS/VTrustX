$PROJECT_ID = "vtrustx"
$REGION = "us-central1"
$IMAGE = "gcr.io/$PROJECT_ID/vtrustx"
$SERVICE = "vtrustx-service"
$DB_INSTANCE = "${PROJECT_ID}:${REGION}:vtrustx"
$DB_PASS = "VTrustX@2030" 

# Credentials from your local setup
$MS_ID = "d40891ff-4272-4b5f-a20b-aeb6e969c3d6"
$MS_SECRET = "Lz48Q~DGdBQ28R~5G2z8aVt~_EcJaxG8XK3clcj0"
$GO_ID = "913176322756-7eeltm3a2b3e4h9o8nkpf0guko9qj83n.apps.googleusercontent.com"
$GO_SECRET = "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"

Write-Host "Starting Build and Deploy Process..."

# 1. Build
Write-Host "Building Docker Image..."
gcloud builds submit --tag $IMAGE .

# 2. Deploy
Write-Host "Deploying Service to Cloud Run..."
$env:GEMINI_API_KEY = (Get-Content .env | Select-String "GEMINI_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1] })

gcloud run deploy vtrustx `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --add-cloudsql-instances $DB_INSTANCE `
  --set-env-vars GOOGLE_CLIENT_ID="$GO_ID" `
  --set-env-vars GOOGLE_CLIENT_SECRET="$GO_SECRET" `
  --set-env-vars DB_PORT="5432"

Write-Host "Deployment Command Sent. Check Cloud Console for URL."
