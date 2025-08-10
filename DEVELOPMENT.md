# LibreChat Development Setup

This guide explains how to run LibreChat in development mode alongside the production deployment.

## Overview

Your production deployment uses:
- **Port 80**: NGINX proxy (production frontend)
- **Port 3080**: API server (production backend)
- **Port 7700**: Meilisearch (now exposed for development access)

Development mode uses:
- **Port 3081**: Development backend server
- **Port 3090**: Development frontend server (Vite dev server)
- **Port 7700**: Shared Meilisearch instance (from production containers)

## Quick Start

1. **Start development servers:**
   ```bash
   npm run dev
   ```
   This runs both backend and frontend in development mode simultaneously.

2. **Or start them separately:**
   ```bash
   # Terminal 1 - Backend
   npm run backend:dev
   
   # Terminal 2 - Frontend  
   npm run frontend:dev
   ```

3. **Access development application:**
   - Development app: http://localhost:3090
   - Production app: http://localhost (unchanged)

## Configuration

### Environment Files
- `.env` - Production configuration (PORT=3080)
- `.env.development` - Development configuration (PORT=3081)

### Key Differences
| Setting | Production | Development |
|---------|------------|-------------|
| Backend Port | 3080 | 3081 |
| Frontend URL | http://localhost | http://localhost:3090 |
| API Target | http://0.0.0.0:3080 | http://0.0.0.0:3081 |
| Environment | production | development |

## Services Shared Between Environments

### MongoDB
Both production and development use the same MongoDB instance.
Connection details should be configured in your environment files.

### Meilisearch
Both use the same Meilisearch container (exposed on port 7700):
```
http://localhost:7700
```

## Troubleshooting

### Port Conflicts
If you get port conflicts:
1. Check what's running: `netstat -tulpn | grep -E ":3081|:3090"`
2. Kill conflicting processes or change ports in `.env.development`

### Meilisearch Connection Issues
1. Verify Meilisearch is accessible: `curl http://localhost:7700/health`
2. Check container status: `docker ps | grep meilisearch`
3. Restart if needed: `docker compose -f deploy-compose.yml restart meilisearch`

### Backend Not Starting
1. Check `.env.development` file exists
2. Verify MongoDB connection
3. Check logs for specific errors

## Development Workflow

1. **Production remains running** - Your live site continues to work
2. **Development on separate ports** - No conflicts with production
3. **Shared data** - Same database and search index
4. **Hot reload** - Frontend changes reload automatically
5. **Backend restart** - Nodemon restarts backend on changes

## Stopping Development

Simply press `Ctrl+C` in the terminal running the dev servers. Production containers continue running normally.

## Production Management

- Start production: `npm run start:deployed`
- Stop production: `npm run stop:deployed`
- Update production: `npm run update:deployed`
