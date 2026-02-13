# Docker Compose Setup

Quick start guide for local development with Docker Compose.

## Services

- **PostgreSQL 15** - Primary database (port 5432)
- **Redis 7** - Cache and session store (port 6379)

## Quick Start

### Start all services

```bash
docker-compose up -d
```

### Start specific service

```bash
# Only PostgreSQL
docker-compose up -d postgres

# Only Redis
docker-compose up -d redis
```

### Stop services

```bash
docker-compose down
```

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f redis
```

### Reset data

```bash
# Stop and remove volumes (deletes all data)
docker-compose down -v

# Restart fresh
docker-compose up -d
```

## Configuration

### PostgreSQL

- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `rayix_db`
- **Port**: `5432`

**Connection string:**
```
postgresql://postgres:postgres@localhost:5432/rayix_db
```

Update `server/.env`:
```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rayix_db
DB_HOST=localhost
DB_PORT=5432
```

### Redis

- **Port**: `6379`
- **No password** (local dev only)
- **Persistence**: Append-only file (AOF)

**Connection string:**
```
redis://localhost:6379
```

Update `server/.env`:
```env
REDIS_URL=redis://localhost:6379
```

## Data Persistence

Data is stored in Docker volumes:
- `postgres_data` - PostgreSQL database files
- `redis_data` - Redis persistence files

Volumes persist across container restarts but are deleted with `docker-compose down -v`.

## Health Checks

Both services have health checks configured:

```bash
# Check service health
docker-compose ps

# Should show "healthy" status:
# rayix-postgres   Up (healthy)
# rayix-redis      Up (healthy)
```

## Troubleshooting

### Port already in use

If ports 5432 or 6379 are already in use:

1. **Change ports in `docker-compose.yml`:**
   ```yaml
   postgres:
     ports:
       - "5433:5432"  # Use 5433 instead of 5432

   redis:
     ports:
       - "6380:6379"  # Use 6380 instead of 6379
   ```

2. **Update `.env` to match:**
   ```env
   DB_PORT=5433
   REDIS_URL=redis://localhost:6380
   ```

### Container won't start

```bash
# Check logs
docker-compose logs postgres
docker-compose logs redis

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Connection refused

1. **Verify services are running:**
   ```bash
   docker-compose ps
   ```

2. **Test connections:**
   ```bash
   # PostgreSQL
   psql postgresql://postgres:postgres@localhost:5432/rayix_db

   # Redis
   redis-cli -h localhost -p 6379 ping
   ```

## Production

**Warning**: This `docker-compose.yml` is for local development only.

For production:
- Use managed services (Google Cloud SQL, Memorystore)
- Set strong passwords
- Enable SSL/TLS
- Configure backups
- Set up monitoring

See:
- `docs/DEPLOYMENT.md` for production setup
- `docs/REDIS_MIGRATION.md` for Redis configuration
