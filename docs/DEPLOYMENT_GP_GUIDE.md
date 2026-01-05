# Deploying VTrustX to Google Cloud Platform (GCP)

This guide outlines the steps to deploy the VTrustX full-stack application (React + Node.js + PostgreSQL) to Google Cloud.

## Architecture Overview
- **Frontend (Client)**: Deployed to **Firebase Hosting** (served via global CDN).
- **Backend (Server)**: Containerized and deployed to **Google Cloud Run** (Serverless).
- **Database**: Managed **Cloud SQL for PostgreSQL**.

### Architecture Diagram
```mermaid
graph LR
    User[User Browser] -- HTTPS --> Firebase[Firebase Hosting\n(Frontend)]
    User -- API Calls --> CloudRun[Cloud Run\n(Node.js Server)]
    
    subgraph Google Cloud Platform
        CloudRun -- Unix Socket --> CloudSQL[(Cloud SQL\nPostgreSQL)]
        CloudSQL -- Backups --> Storage[Cloud Storage]
    end
```

---

## Prerequisites
1.  **Google Cloud Project**: Create one at [console.cloud.google.com](https://console.cloud.google.com).
2.  **Billing**: Enable billing for the project.
3.  **CLI Tools**: Install `gcloud` CLI and `firebase-tools`.
    ```bash
    npm install -g firebase-tools
    ```

---

## Step 1: Database Setup (Cloud SQL)

1.  Go to **Cloud SQL** in GCP Console.
2.  Create a **PostgreSQL** instance.
    -   **Instance ID**: `vtrustx-db`
    -   **Password**: *[Create a strong password]*
    -   **Region**: Same as where you plan to deploy (e.g., `us-central1`).
3.  Once created, create a database named `vtrustx_db`.
4.  **Important**: Note the **Connection Name** (e.g., `project-id:region:instance-id`).

---

## Step 2: Backend Deployment (Cloud Run)

We will containerize the server and deploy it.

### 2.1. Prepare Docker
A `Dockerfile` has been created in `./server/Dockerfile`.

### 2.2. Build & Push Container
Run these commands in your terminal (from `VTrustX/server` folder):

```powershell
# Authenticate
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# Enable Artifact Registry
gcloud services enable artifactregistry.googleapis.com run.googleapis.com sqladmin.googleapis.com

# Create a repository (only once)
gcloud artifacts repositories create vtrustx-repo --repository-format=docker --location=us-central1 --description="VTrustX Repository"

# Build and Push Image
gcloud builds submit --tag us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/vtrustx-repo/server
```

### 2.3. Deploy to Cloud Run
Replace the values in brackets `[]` before running.

```powershell
gcloud run deploy vtrustx-api \
  --image us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/vtrustx-repo/server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances [YOUR_DB_CONNECTION_NAME] \
  --set-env-vars DB_HOST=/cloudsql/[YOUR_DB_CONNECTION_NAME] \
  --set-env-vars DB_USER=postgres \
  --set-env-vars DB_PASSWORD=[YOUR_DB_PASSWORD] \
  --set-env-vars DB_NAME=vtrustx_db \
  --set-env-vars GENESYS_CLIENT_ID=[YOUR_ID] \
  --set-env-vars GENESYS_CLIENT_SECRET=[YOUR_SECRET]
```

*Note the URL provided after deployment (e.g., `https://vtrustx-api-xyz.a.run.app`). You will need this for the frontend.*

---

## Step 3: Frontend Deployment (Firebase Hosting)

### 3.1. Update Environment Variables
In your `client` folder, create `.env.production`:

```env
VITE_API_URL=https://vtrustx-api-xyz.a.run.app
```

### 3.2. Initialize Firebase
Run inside `VTrustX/client`:

```powershell
firebase login
firebase init
```

*   **Which features?**: `Hosting: Configure files for Firebase Hosting...`
*   **Project**: Use an existing project -> Select your GCP project.
*   **Public directory**: `dist` (Vite builds to `dist`).
*   **Configure as single-page app?**: `Yes`
*   **Set up automatic builds with GitHub?**: `No` (for now).

### 3.3. Build & Deploy
```powershell
npm run build
firebase deploy
```

---

## Step 4: Final Configuration

1.  **Database Initialization**:
    Your server attempts to connect to the DB on startup. To create the tables, you might need to run the `init.sql` script. You can connect to your Cloud SQL instance using a local client (like pgAdmin or DBeaver) via the **Cloud SQL Auth Proxy** and run the contents of `./server/init.sql`.

2.  **CORS**:
    Ensure your Server's `cors` configuration accepts requests from your new Firebase domain (`https://your-project.web.app`).

    *In `server/index.js`, update:*
    ```javascript
    app.use(cors({
        origin: ['https://your-project.web.app', 'http://localhost:5173']
    }));
    ```

---

**You are now live!** 🚀
