# How to Register an Application in Azure Portal for VTrustX OAuth

Follow these steps to configure "Log in with Microsoft" for your VTrustX application.

## Prerequisites
- A Microsoft Azure account with permissions to manage applications in Microsoft Entra ID (formerly Azure Active Directory).

## Step-by-Step Guide

### 1. Create the App Registration
1.  Navigate to the [Azure Portal](https://portal.azure.com).
2.  Search for **Microsoft Entra ID** and select it.
3.  In the left menu, select **App registrations**.
4.  Click **+ New registration**.
5.  **Name**: Enter `VTrustX` (or your preferred app name).
6.  **Supported account types**:
    *   Select **Accounts in this organizational directory only (Single tenant)** if this is for internal use only.
    *   Select **Accounts in any organizational directory (Multitenant)** if you want to allow users from other organizations to log in.
7.  **Redirect URI**:
    *   Select platform: **Web**.
    *   Enter your Production URI:  
        `https://vtrustx-service-142641550878.us-central1.run.app/api/auth/microsoft/callback`
    *   *(Optional)* You can add a Local URI later for testing (e.g., `http://localhost:3000/api/auth/microsoft/callback`).
8.  Click **Register**.

### 2. Configure Client Secret
1.  After registration, you will be taken to the app's **Overview** page.
2.  In the left menu, select **Certificates & secrets**.
3.  Under **Client secrets**, click **+ New client secret**.
4.  **Description**: Enter `VTrustX Server Key`.
5.  **Expires**: Select an expiration period (e.g., 6 months, 12 months).
6.  Click **Add**.
7.  **IMPORTANT**: Copy the **Value** of the secret immediately. This is your `MICROSOFT_CLIENT_SECRET`. You will not be able to see it again after you leave the page.

### 3. Get Client ID
1.  Go back to the **Overview** page.
2.  Copy the **Application (client) ID**. This is your `MICROSOFT_CLIENT_ID`.

### 4. Configure Deploy Environment
You need to add these credentials to your Cloud Run service environment variables.

**Using Google Cloud Console:**
1.  Go to Cloud Run -> `vtrustx-service` -> **Edit & Deploy New Revision**.
2.  Go to **Variables & Secrets**.
3.  Add Variable:
    *   Name: `MICROSOFT_CLIENT_ID`
    *   Value: *(Paste Application ID)*
4.  Add Variable:
    *   Name: `MICROSOFT_CLIENT_SECRET`
    *   Value: *(Paste Secret Value)*
5.  Click **Deploy**.

**Using Command Line:**
```powershell
gcloud run services update vtrustx-service --region us-central1 --set-env-vars MICROSOFT_CLIENT_ID="<YOUR_ID>",MICROSOFT_CLIENT_SECRET="<YOUR_SECRET>"
```

### 5. Verification
1.  Wait for the deployment to finish.
2.  Visit your VTrustX login page.
3.  Click "Continue with Microsoft".
4.  You should be redirected to the Microsoft login screen.
