# RayiX Technical Architecture & Best Practices

This document provides a comprehensive overview of the RayiX software architecture, technology stack, and the engineering best practices implemented within the project.

---

## 🏗 System Architecture

RayiX follows a **Client-Server Architecture** designed for scalability, modularity, and high-performance Experience Management (XM).

### 1. Frontend (Client)
- **Framework**: [React.js](https://reactjs.org/) (Version 18+)
- **Build Tool**: [Vite](https://vitejs.dev/) for ultra-fast development and optimized production builds.
- **State Management**: React Hooks (`useState`, `useContext`, `useReducer`, `useMemo`).
- **Data Visualization**: [Recharts](https://recharts.org/) & [Chart.js](https://www.chartjs.org/) for interactive analytical dashboards.
- **Forms Engine**: [SurveyJS](https://surveyjs.io/) for dynamic, schema-driven survey creation and rendering.
- **Styling**: Vanilla CSS with modern Flexbox/Grid layouts and curated color palettes for a premium UI.

### 2. Backend (Server)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Architecture Pattern**: **Layered Architecture**
  - **API Layer**: Route handlers located in `src/api/routes`.
  - **Service Layer**: Business logic encapsulated in `src/services`.
  - **Infrastructure Layer**: Database and external service connectors in `src/infrastructure`.
  - **Core/Entities**: Data models and domain definitions in `src/core`.

### 3. Database
- **Engine**: [PostgreSQL](https://www.postgresql.org/) (Hosted on Google Cloud SQL).
- **Access Pattern**: Generic **Repository Pattern** (`PostgresRepository.js`) ensuring clean abstraction between database logic and business routes.
- **Schema Management**: Managed via `init.sql` and automated "Ensure Table" scripts during startup.

---

## 🚀 AI Integration Layer

RayiX is an "AI-First" platform with a robust integration layer:
- **LLM Support**: Built-in support for **Google Gemini (Vertex AI)** and **OpenAI**.
- **Capabilities**:
  - **AI Survey Generation**: Automated creation of surveys from prompts.
  - **AI Text Insights**: Sentiment analysis and theme extraction using Text IQ.
  - **AI Persona Engine**: Dynamic generation of customer personas and journey maps.
  - **AI Voice Agents**: Interactive AI-driven voice surveys via browser-based and server-side STT/TTS.

---

## 🛡 Security & Reliability

We follow industry-standard security practices:
- **Authentication**: JWT-based authentication with `Passport.js`.
- **Encryption**: Passwords are multi-stage hashed using `bcryptjs`.
- **Security Headers**: Integrated `helmet` for protection against Clickjacking, XSS, and other common attacks.
- **Input Sanitization**: JSON body limits and structured URL parameter parsing.
- **Error Handling**: Global asychronous error-handling middleware ensures failures are logged without crashing the server or leaking sensitive data.

---

## 🛠 Engineering Best Practices

The development of RayiX adheres to the following best practices:

### 1. Separation of Concerns
- Business logic is strictly kept out of route handlers and placed into dedicated **Services**.
- Database queries are abstracted through a **Repository** layer, allowing for easy database engine swaps (e.g., from PG to MySQL) with minimal code changes.

### 2. Performance Optimization
- **Database Indexing**: Targeted queries (e.g., `findBy`) are used instead of global table scans.
- **Memoization**: Heavy frontend computations and expensive React renders are optimized using `useMemo` and `useCallback`.
- **Code Splitting**: Dynamic imports and build-time optimization via Vite to keep bundle sizes manageable.

### 3. Internationalization (i18n)
- Full RTL and LTR support using `react-i18next`.
- Centralized translation files for English and Arabic.

### 4. Code Standards & Linting
- **ESLint**: Enforces consistent coding styles across the entire 100+ file codebase.
- **Prettier**: (Recommended integration) for automated formatting.

### 5. Deployment (DevOps)
- **Containerization**: Fully Dockerized environments.
- **Cloud Native**: Designed for **Google Cloud Run** for serverless, auto-scaling deployment.
- **CORS Management**: Configurable CORS policies to secure API access.

---

## 📂 Documentation Links

For more detailed module-specific documentation, refer to:
- [User Manual](../USER_MANUAL.md)
- [Deployment Guide](../DEPLOY_TO_GCP.md)
- [AI Provider Configuration](./docs/AI_PROVIDERS.md)
- [Export Architecture](./docs/EXPORT_MODULE_ARCHITECTURE.md)
- [Persona Engine Docs](./docs/CX_Persona_Definitions.md)

---
*Last Updated: February 2026*
