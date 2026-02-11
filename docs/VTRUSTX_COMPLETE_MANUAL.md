# RayiX - Complete Application Manual & Documentation

## 1. Introduction
RayiX is an advanced Customer Experience (CX) and Marketing Engagement platform designed to help businesses understand, manage, and engage with their customers effectively. It combines powerful Persona Engine technology, AI-driven surveys, and a comprehensive Social Media Marketing module into a unified ecosystem.

### Key Capabilities
- **Persona Engine**: Create and assign dynamic customer personas based on demographic and behavioral data.
- **AI-Powered Surveys**: Generate surveys instantly using AI and conduct voice-based surveys with AI agents.
- **Social Media Marketing**: Manage multi-platform campaigns targeting specific personas.
- **Customer 360**: A holistic view of every customer, including their history, personas, and interactions.
- **Ticket Management**: Integrated support ticketing system.

---

## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend**: React.js (Vite), TailwindCSS, Radix UI.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (Google Cloud SQL).
- **AI Service**: Dedicated Node.js service for handling AI interactions (Gemini, Groq, Vertex AI).
- **Authentication**: JWT, Passport.js.
- **Infrastructure**: Google Cloud Platform (Cloud Run).

### 2.2 System Components
1.  **Client (`/client`)**: The user interface for administrators, marketers, and agents.
2.  **Server (`/server`)**: The core API handling business logic, database interactions, and user management.
3.  **AI Service (`/ai-service`)**: A specialized microservice for processing voice, text generation, and LLM integrations.

---

## 3. Installation & Setup

### 3.1 Prerequisites
- **Node.js**: v18 or higher.
- **PostgreSQL**: v14 or higher (or connection to Cloud SQL).
- **Google Cloud SDK**: For deployment.

### 3.2 Environment Configuration
Create a `.env` file in the root directory with the following keys:
```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=rayix-db
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=your_jwt_secret
API_KEY_GEMINI=your_gemini_key
```

### 3.3 Running Locally
RayiX includes a helper script to start all services simultaneously.

**Option 1: Using PowerShell Script**
```powershell
./start-dev.ps1
```
This will launch the Main Server (Port 3000), AI Service (Port 3001), and Client (Port 5173).

**Option 2: Manual Start**
1.  **Client**: `cd client && npm run dev`
2.  **Server**: `cd server && npm run dev`
3.  **AI Service**: `cd ai-service && npm run dev`

---

## 4. User Manual

### 4.1 Dashboard Overview
Upon logging in, the **Dashboard** provides a high-level view of system health, active users, and key metrics. The sidebar allows navigation to all major modules.

### 4.2 Persona Engine
The **Persona Engine** is the heart of RayiX's targeting capability.
- **Persona Builder**: Define personas visually using demographic traits, income levels, and behavioral patterns.
- **Persona Assignment**: The system automatically assigns personas to customers based on their profile data.
- **Audit Logs**: Track why a persona was assigned or removed for compliance purposes.
- **Usage**: Go to **Personas & Segments > Persona Builder** to start.

### 4.3 Social Media Marketing
Create and manage campaigns targeting specific personas.
1.  Navigate to **Social Media Marketing**.
2.  Click **Create Campaign**.
3.  **Step 1**: Define Campaign Name, Objective, and Budget.
4.  **Step 2**: Select Platforms (Facebook, Instagram, LinkedIn, etc.).
5.  **Step 3**: Target Personas using the **Persona Selector**. This allows you to market directly to "Tech Savvy Millennials" or "High Value Enterprise" segments.
6.  **Step 4**: Review and Launch.
*Features*: Analytics dashboard to track Reach, Engagement, and ROI.

### 4.4 Survey Management
- **Form Builder**: Drag-and-drop interface to create surveys.
    - *AI Generation*: Click "Generate with AI" and describe your survey needs to have it built automatically.
- **Distribution**: Share surveys via Link, Email, or QR Code.
- **Voice Surveys**: Use the **AI Surveyor** to conduct automated voice interviews with customers.

### 4.5 Customer 360 & CRM
- **Customer List**: View all contacts.
- **Customer Profile**: Click any customer to see their **360 View**.
    - **Interactions**: History of tickets and surveys.
    - **Persona Tab**: See which personas map to this customer, complete with match confidence scores.

### 4.6 Support Ticketing
Manage customer support requests.
- **Ticket List**: Filter by status (Open, Closed, Pending).
- **Ticket Detail**: Reply to customers, change status, and assign to agents.

---

## 5. API Reference

### 5.1 Main Server Endpoints (`/api/v1`)
- **Auth**: `/auth/login`, `/auth/register`
- **Users**: `/users` (CRUD)
- **Surveys**: `/surveys` (Create, Read, Update, Delete)
- **Personas**: `/persona/profiles` (Assign, Audit Logs)
- **Social Media**: `/social-media/campaigns`

### 5.2 AI Service Endpoints
- **Voice**: `/voice/call` (Initiate AI calls)
- **Generate**: `/generate/form` (AI Form generation)

---

## 6. Troubleshooting

**Issue: "ECONNREFUSED" Database Error**
- Ensure your local PostgreSQL is running or your Cloud SQL Proxy is active.
- Check `DB_HOST` and `DB_PORT` in your `.env` file.

**Issue: AI Features not working**
- Verify `API_KEY_GEMINI` or `OPENAI_API_KEY` are set in the `.env` file.
- Ensure the AI Service is running on Port 3001.

**Issue: Blank Screen on Client**
- Check the browser console (F12) for JavaScript errors.
- Ensure the backend server is running and reachable at `http://localhost:3000`.

---
*Documentation Generated: 2026-01-15*
