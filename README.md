# RayiX

Multi-tenant Customer Experience Management Platform built with React + Express + PostgreSQL.

## Architecture

```
RayiX/
├── client/          React 18 + Vite frontend
├── server/          Express.js REST API
├── ai-service/      Standalone AI microservice
└── docs/            Technical documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router 6, SurveyJS, Recharts, ReactFlow |
| Backend | Express.js 4, PostgreSQL, Winston, Joi, Helmet |
| Auth | JWT + bcrypt, Google/Microsoft OAuth (Passport.js) |
| AI | Google Gemini, Vertex AI, Groq |
| Mobile | Capacitor (iOS + Android) |
| Deploy | Docker, GCP Cloud Run, Firebase Hosting |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Setup

```bash
# 1. Clone
git clone <repo-url> && cd RayiX

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys

# 4. Start development
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

The client runs on `http://localhost:5173` and proxies API calls to `http://localhost:3000`.

### Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_NAME` | Yes | Database name |
| `DB_HOST` | Yes | Database host |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `DB_ENCRYPTION_KEY` | Yes | AES-256 encryption key (separate from JWT_SECRET) |
| `FRONTEND_URL` | Prod | CORS allowed origins (comma-separated) |

## Testing

```bash
# Client tests (Vitest)
cd client && npm test

# Server tests (Jest)
cd server && npm test
```

## Deployment

See [DEPLOY_TO_GCP.md](./DEPLOY_TO_GCP.md) for Google Cloud Run deployment instructions.

```bash
# Build Docker image
docker build -t rayix .

# Run container
docker run -p 8080:8080 --env-file .env rayix
```

## Key Features

- **Survey Builder** — Drag-and-drop form builder with SurveyJS, custom CSAT/CES/NPS controls
- **Analytics Studio** — Custom dashboards with charts, gauges, and export (XLSX, PDF, PPTX)
- **CX Personas** — AI-powered persona creation and management
- **Customer Journey Mapping** — Visual journey builder with ReactFlow
- **CRM & Ticketing** — Ticket management with email channel integration (IMAP)
- **AI Integrations** — Gemini, Vertex AI, Groq for content generation and analysis
- **Reputation Manager** — Review tracking and AI-generated replies
- **Multi-tenant** — Full tenant isolation with role-based permissions
- **i18n** — English and Arabic with RTL support

## Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Development Setup](./DEVELOPMENT_SETUP.md)
- [User Manual](./USER_MANUAL.md)
