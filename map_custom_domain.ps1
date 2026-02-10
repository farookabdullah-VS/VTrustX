Write-Host "Mapping rayix.ai to rayix-service..."
# 1. Map Root Domain
gcloud beta run domain-mappings create --service rayix-service --domain rayix.ai --region me-central1 --project rayixcx --quiet

# 2. Map WWW Subdomain
Write-Host "Mapping www.rayix.ai to rayix-service..."
gcloud beta run domain-mappings create --service rayix-service --domain www.rayix.ai --region me-central1 --project rayixcx --quiet

Write-Host "Done. If successful, follow the DNS instructions output above."
