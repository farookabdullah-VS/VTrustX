
Write-Host "Starting VTrustX Backend Services..."

# Start Main Server
Write-Host "Starting Main Server (Port 3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm start"

# Start AI Service
Write-Host "Starting AI Service (Port 3001)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai-service; npm start"

Write-Host "Both services launched. Please check the new windows."
