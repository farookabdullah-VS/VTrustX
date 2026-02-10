$PROJECT_ID = "rayixcx"
$REGION = "me-central1"
$IMAGE = "gcr.io/$PROJECT_ID/rayix-ai"
$SERVICE = "rayix-ai"
$DB_INSTANCE = "rayixcx:me-central1:rayix"
Write-Host "Target DB Instance: $DB_INSTANCE"
$DB_PASS = "Yaalla@123" 
$DB_NAME = "rayix-db"

# Workaround for Agent PAGER=cat issue on Windows
$env:PAGER = "more"

Write-Host "Starting AI Service Build and Deploy..."

# 1. Build
Write-Host "Building Docker Image for AI Service..."
# Build from the ai-service subdirectory
gcloud builds submit --quiet --timeout=20m --project $PROJECT_ID --tag $IMAGE ./ai-service

# 2. Deploy
Write-Host "Deploying AI Service to Cloud Run..."

# Helper to safely extract env var
function Get-EnvVar($key) {
    $val = (Get-Content .env | Select-String $key | ForEach-Object { $_.ToString().Split('=')[1] })
    if ($val) { return $val.Trim() }
    return ""
}

# Extract keys from root .env or ai-service/.env
# Assuming root .env has the master keys
$GEMINI_KEY = Get-EnvVar "GEMINI_API_KEY"
$OPENAI_KEY = Get-EnvVar "OPENAI_API_KEY"
$GROQ_KEY = Get-EnvVar "GROQ_API_KEY"
$TWILIO_SID = Get-EnvVar "TWILIO_ACCOUNT_SID"
$TWILIO_TOKEN = Get-EnvVar "TWILIO_AUTH_TOKEN"
$TWILIO_PHONE = Get-EnvVar "TWILIO_PHONE_NUMBER"

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
    --set-env-vars GEMINI_API_KEY="$GEMINI_KEY" `
    --set-env-vars OPENAI_API_KEY="$OPENAI_KEY" `
    --set-env-vars GROQ_API_KEY="$GROQ_KEY" `
    --set-env-vars TWILIO_ACCOUNT_SID="$TWILIO_SID" `
    --set-env-vars TWILIO_AUTH_TOKEN="$TWILIO_TOKEN" `
    --set-env-vars TWILIO_PHONE_NUMBER="$TWILIO_PHONE" `
    --set-env-vars DB_PORT="5432" `
    --set-env-vars CORE_SERVICE_URL="https://rayix-service-1072119297262.me-central1.run.app" `
    --set-env-vars NODE_ENV="production"

Write-Host "AI Service Deployment Command Sent."
