# VTrustX Development Setup

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 15+
- **npm** 10+

## Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd VTrustX

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Environment Setup

```bash
# Copy example env file
cp server/.env.example server/.env

# Edit with your values (at minimum):
# - JWT_SECRET (any strong random string, 32+ chars)
# - DB_USER, DB_PASSWORD, DB_NAME
```

### 3. Database Setup

```bash
# Create the database
createdb rayix_db

# Tables are auto-created on first server start via migration scripts
```

### 4. Running Locally

```bash
# Terminal 1: Start the server
cd server && npm run dev

# Terminal 2: Start the client
cd client && npm run dev
```

- Server runs on `http://localhost:3000`
- Client runs on `http://localhost:5173` (Vite proxy forwards `/api` to server)

### 5. Running Tests

```bash
# Server tests (with coverage)
cd server && npm test

# Client tests
cd client && npm test
```

## Project Structure

```
VTrustX/
├── server/                          # Express.js backend
│   ├── index.js                     # Entry point, routes, middleware
│   ├── src/
│   │   ├── api/
│   │   │   ├── middleware/          # Auth, validation, error handling, logging
│   │   │   ├── routes/             # 48 route files (auth, forms, crm, etc.)
│   │   │   └── schemas/            # Joi validation schemas
│   │   ├── core/                   # Domain entities and business logic
│   │   ├── infrastructure/
│   │   │   ├── database/           # PostgreSQL pool, repository pattern
│   │   │   ├── security/           # Encryption utilities
│   │   │   ├── logger.js           # Winston structured logger
│   │   │   └── cache.js            # NodeCache abstraction layer
│   │   ├── services/               # Business services (email, AI, exports)
│   │   └── scripts/                # Database migration scripts
│   └── jest.config.js
├── client/                          # React 18 + Vite frontend
│   ├── src/
│   │   ├── App.jsx                 # React Router + lazy loading
│   │   ├── main.jsx                # Entry point with ErrorBoundary
│   │   ├── contexts/               # Auth, Theme, Notification contexts
│   │   ├── components/
│   │   │   ├── layout/             # AppLayout with sidebar + header
│   │   │   ├── common/             # Shared components (LoadingSpinner)
│   │   │   ├── CJM/               # Customer Journey Mapping
│   │   │   ├── analytics/          # Analytics Studio
│   │   │   ├── persona/            # CX Persona Builder
│   │   │   └── ...                 # 100+ feature components
│   │   ├── services/               # API service wrappers
│   │   └── i18n.js                 # Internationalization (EN/AR)
│   └── vitest.config.js
└── API_DOCUMENTATION.md
```

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (uptime, timestamp) |
| `GET /ready` | Readiness check (DB connectivity) |
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | User login (returns JWT) |
| `GET /api/forms` | List surveys/forms |
| `GET /api/submissions` | List form submissions |
| `GET /api/crm/tickets` | List CRM tickets |

## Architecture Decisions

- **Auth**: JWT tokens, 24h expiry, cached for 60s per user
- **Database**: PostgreSQL with connection pooling (max 20)
- **Caching**: NodeCache (Redis-ready interface) for auth, tenants, sessions
- **Logging**: Winston with JSON (prod) / colorized (dev) format
- **Validation**: Joi schemas on critical POST/PUT routes
- **Client Routing**: React Router v6 with lazy loading
- **State**: React Context (Auth, Theme, Notifications)
- **i18n**: i18next with English and Arabic translations
