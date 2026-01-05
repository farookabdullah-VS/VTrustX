# Zero-Cost AI Voice Agent Stack

You asked for a **Completely Free** technology stack to automate calling customer lists using an AI Agent. While telephony (connecting to real phone lines) usually costs money, you can bypass these costs by leveraging hardware you likely already own: your **Android Phone** and **Windows PC**.

## 1. The Core Architecture
Instead of paying usage fees to Twilio or Vapi ($0.15/min), we will use:
*   **Telephony**: Your Android Phone (with its existing unlimited calling plan).
*   **Intelligence (AI)**: Google Gemini 1.5 Flash (Free Tier).
*   **Voice Processing**: Google Chrome Web Speech API (Free Native Browser Feature).
*   **Automation**: ADB (Android Debug Bridge).
*   **Audio Routing**: Bluetooth "Hands-Free Profile" (HFP).

## 2. Hardware Setup (The "Bluetooth Bridge")
To make your computer the "Brain" and your phone the "Mouth/Ear", follow these steps:

1.  **Pair Phone to PC**: Connect your Android phone to your Windows PC via Bluetooth.
2.  **Audio Routing**: 
    *   On Windows, ensure your Phone is connected as an "Audio" device.
    *   You may need a free app like **"Bluetooth Audio Receiver"** (available on Microsoft Store) to route the phone's call audio *into* your computer's microphone input.
    *   *Simpler Option*: Put your phone on **Speakerphone** next to your computer's microphone/speakers (Acoustic Coupling). This works surprisingly well for demos.

## 3. Automation Setup (Auto-Dialing)
To automate the "Calling the list" part without touching the phone:

1.  **Enable Developer Options** on Android (Tap Build Number 7 times).
2.  **Enable USB Debugging**.
3.  **Connect via USB** to your PC.
4.  **Install ADB** on your PC (`choco install adb` or download manually).
5.  **Scripting the Dialing**:
    You can use a simple script to trigger calls from your server:
    ```bash
    adb shell am start -a android.intent.action.CALL -d "tel:+15551234567"
    ```

## 4. The Software Stack (What we built)
We have already implemented the software side in `WebCallModal.jsx`. 

*   **Brain**: `GeminiProvider.js` uses Google's Free Tier API.
*   **Ears**: The "Web Call" modal uses Chrome's `webkitSpeechRecognition`.
*   **Mouth**: The "Web Call" modal uses `speechSynthesis`.

## 5. Workflow for "Zero Cost" Operations

1.  **Open the Survey Audience** in the VTrustX Dashboard.
2.  **Setup Hardware**: 
    *   Phone on desk (Speaker mode) OR Connected via Bluetooth.
3.  **Start Automator** (Hypothetical Script):
    *   Computer sends `adb` command to Phone -> Phone Dials Customer.
    *   Customer picks up.
    *   You click **"Test Web Call"** on the Dashboard.
    *   The AI starts talking *through* your computer speakers -> into the Phone -> to the Customer.
    *   Customer speaks -> Phone Speaker -> Computer Mic -> AI listens.
4.  **Logging**: The system automatically saves the transcript and results to the database.

## Summary of Technologies
| Component | Free Solution | Paid Equivalent |
| :--- | :--- | :--- |
| **Call Transport** | **Android Phone + SIM** | Twilio / SIP Trunk |
| **Dialing Logic** | **ADB (Android Debug Bridge)** | Twilio API |
| **Brain / LLM** | **Google Gemini 1.5 Flash** (Free Tier) | OpenAI GPT-4 |
| **Speech-to-Text** | **Chrome Web Speech API** | Deepgram / Whisper |
| **Text-to-Speech** | **Chrome Speech Synthesis** | ElevenLabs |

This stack effectively costs **$0.00** assuming you already have a phone, a PC, and an internet connection.
