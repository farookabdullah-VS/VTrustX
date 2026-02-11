# How to Activate Google Gemini 1.5 Flash (Free)

To enable the free AI Brain for your calls, follow these 3 simple steps.

## Step 1: Get Your Free API Key
1.  Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2.  Sign in with your Google Account.
3.  Click **"Create API Key"**.
4.  Copy the key (it starts with `AIza...`).

## Step 2: Configure RayiX
1.  Open the file: `d:\RayiX\ai-service\.env`
2.  Find the line `GEMINI_API_KEY=...`
3.  Paste your key there.
    ```env
    AI_PROVIDER=gemini
    GEMINI_API_KEY=Paste_Your_Key_Here
    ```
4.  Save the file.

## Step 3: Restart the Service
For the new key to take effect, you must restart the AI Service.
1.  Run this in your terminal:
    ```bash
    cd d:\RayiX\ai-service
    npm start
    ```

## Done!
Your Agent is now powered by Google's latest Gemini 1.5 Flash model for free.
