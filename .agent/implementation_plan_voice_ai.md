
# Implementation Plan - Voice AI Persona Generation

## Overview
This implementation enables users to create personas using voice input. The voice recording is captured in the frontend, sent to the backend, and processed by Gemini Multimodal AI to generate a structured Persona JSON.

## UI Updates
- **Add Persona Modal**:
  - **Background**: Updated to **pale green** (`#f0fdf4`) to match the VTrustX theme.
  - **Icons**: Replaced emojis with distinct **Lucide React icons** (`FileText`, `ClipboardList`, `Sparkles`, `Mic`).
  - **Effects**: Added a **css-based glitter animation** to the AI icons (Text and Voice) to make them stand out.
  - **Options**: Distinct cards for "Using AI Text" and "Using AI Voice" for clear entry points.

## Changes

### 1. Backend (`server/`)
- **`src/services/AiService.js`**: Updated `generateContent` to accept an optional `fileData` argument.
- **`src/api/routes/ai.js`**: Added `POST /generate-multimodal` endpoint for file uploads.

### 2. Frontend (`client/`)
- **`src/components/CxPersonaBuilder.jsx`**:
  - **`AddPersonaModal`**: Restyled with pale green theme, new icons, and animations.
  - **`CreateAIModal`**: Integrated `MediaRecorder` logic for voice capture.
  - **`PersonaList`**: Wired up the new voice button to open the generation modal.

## Usage
1. Click "**+ Add Persona**" in the Persona Builder.
2. Select the **"Using AI Voice"** card (pulsing red/glittering).
3. Click "**Record Voice Input**", speak your description, and stop.
4. The AI generates the persona automatically.
