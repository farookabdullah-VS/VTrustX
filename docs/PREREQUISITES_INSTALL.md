# 🛠️ VTrustX Deployment Prerequisites

It seems you are missing the necessary Command Line Tools to deploy to Google Cloud. 
Please install the following to proceed:

### 1. Google Cloud CLI (`gcloud`)
This is required to manage your Google Cloud resources (Cloud Run, SQL, etc.).
*   **Download**: [Google Cloud SDK Installer](https://cloud.google.com/sdk/docs/install#windows)
*   **Action**: Download, run the installer, and make sure to **Login** when prompted.

### 2. Docker Desktop
This is required to "containerize" your server (package it for the cloud).
*   **Download**: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
*   **Action**: Install and ensure it is running in your system tray.

### ✅ Checklist Status
*   [x] **Firebase CLI**: INSTALLED (v15.1.0) - *Ready for Frontend Deployment!*
*   [ ] **Google Cloud CLI**: MISSING - *Required for Backend/Database*
*   [ ] **Docker Desktop**: MISSING - *Required for Backend compilation*

> ⚠️ **We cannot deploy the Server or Database without Gcloud and Docker.**
> Please install them using the links above, then restart your VS Code to load the new PATH settings.
