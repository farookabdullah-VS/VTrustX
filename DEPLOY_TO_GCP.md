# Deploying VTrustX to Google Cloud

This guide will help you deploy the VTrustX full-stack application (React + Node.js + PostgreSQL) to Google Cloud Platform (GCP) using **Cloud Run** and **Cloud SQL**.

## Architecture Overview
- **Frontend**: React (Vite) - served statically by the Node.js backend.
- **Backend**: Node.js (Express) - runs on Cloud Run.
- **Database**: PostgreSQL - hosted on Cloud SQL.

---

## Prerequisites
1.  **Google Cloud Project**: Create one at [console.cloud.google.com](https://console.cloud.google.com).
2.  **Billing**: Enable billing for your project.
3.  **Google Cloud SDK**: Install the `gcloud` CLI on your local machine if strictly necessary (or use Cloud Shell in the browser).

## Step 1: Initial Setup

1.  **Enable Required APIs**:
    Run these commands in your terminal (or Cloud Shell):
    ```bash
    gcloud services enable run.googleapis.com \
        sqladmin.googleapis.com \
        cloudbuild.googleapis.com \
        artifactregistry.googleapis.com
    ```

2.  **Configure gcloud**:
    ```bash
    gcloud config set project gen-lang-client-0151326334
    gcloud config set run/region us-central1  # OR your preferred region
    ```

## Step 2: Create the Database (Cloud SQL)

1.  **Create a PostgreSQL Instance**:
    ```bash
    gcloud sql instances create vtrustx \
        --database-version=POSTGRES_15 \
        --cpu=1 --memory=3840MiB \
        --region=us-central1
    ```
    *(Note: This creates a small production instance. For testing, you can use `--tier=db-f1-micro` but it has very limited resources).*

2.  **Set the 'postgres' user password**:
    ```bash
    gcloud sql users set-password postgres \
        --instance=vtrustx \
        --password=VTrustX@2030
    ```

3.  **Create the Database**:
    ```bash
    gcloud sql databases create vtrustx-db --instance=vtrustx
    ```

## Step 3: Deploy the Application

We have configured the application to build both the Client and Server into a single container using the `Dockerfile` in the root directory.

1.  **Submit the Build to Cloud Build**:
    This will zip your code, build it in the cloud, and store the image.
    ```bash
    gcloud builds submit --tag gcr.io/gen-lang-client-0151326334/vtrustx .
    ```
    *(Replace `YOUR_PROJECT_ID` with your actual project ID).*

2.  **Deploy to Cloud Run**:
    You need to set the environment variables properly. Replace the values below with your actual database credentials.
    ```bash
    gcloud run deploy vtrustx-service \
        --image gcr.io/gen-lang-client-0151326334/vtrustx \
        --platform managed \
        --allow-unauthenticated \
        --add-cloudsql-instances gen-lang-client-0151326334:us-central1:vtrustx \
        --set-env-vars INSTANCE_CONNECTION_NAME="gen-lang-client-0151326334:us-central1:vtrustx" \
        --set-env-vars DB_HOST="127.0.0.1" \
        --set-env-vars DB_USER="postgres" \
        --set-env-vars DB_PASSWORD="VTrustX@2030" \
        --set-env-vars DB_NAME="vtrustx_db" \
        --set-env-vars NODE_ENV="development"
    ```
    *Important*: Cloud Run automatically proxies the Cloud SQL connection to `127.0.0.1` when you use the `--add-cloudsql-instances` flag.

## Step 4: Initialize the Database

Since the database is brand new, you need to run your schemas.

**Option A: Cloud SQL Auth Proxy (Recommended)**
1.  Install the [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy).
2.  Start the proxy locally:
    ```bash
    ./cloud_sql_proxy -instances=gen-lang-client-0151326334:us-central1:vtrustx=tcp:5432
    ```
3.  Run your local initialization script pointing to localhost:
    ```bash
    # In a separate terminal window
    cd server
    # Ensure your local .env points to localhost, postgres, password...
    npm run db:init
    ```

**Option B: One-off Job**
You can also deploy a "Job" in Cloud Run that uses the same container but runs the `npm run db:init` command.

## Step 5: (Optional) Separate AI Service
If the `ai-service` folder contains a separate microservice required for calling/SMS features:
1.  Create a separate `Dockerfile` inside `ai-service/`.
2.  Deploy it as a separate Cloud Run service (e.g., `vtrustx-ai`).
3.  Update the main `vtrustx-service` environment variables to point to this new service URL if they communicate via HTTP.

## Troubleshooting
- **Logs**: View logs in the Google Cloud Console > Cloud Run > vtrustx-service > Logs.
- **Connection Issues**: Ensure the `INSTANCE_CONNECTION_NAME` is correct and the Service Account has permissions (Cloud Run usually does by default).
