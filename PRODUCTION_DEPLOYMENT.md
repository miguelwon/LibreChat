# LibreChat Production Deployment Guide

This guide will help you deploy your customized LibreChat fork for production.

## What Was Modified

1. **deploy-compose.yml** - Modified to:
   - Build from local source instead of using pre-built images
   - Remove vectordb, rag_api, and mongodb services (using external MongoDB)
   - Use external MongoDB via environment variable

2. **Dockerfile.multi** - Copied to root directory for building

3. **env.production.example** - Created with required environment variables

## Prerequisites

- Docker and Docker Compose installed
- External MongoDB instance running and accessible
- Your fork with custom changes

## Deployment Steps


### 2. Update Environment Variables
Edit `.env` file and update these critical values:

- **MONGO_URI**: Point to your existing MongoDB container
  - Example: `mongodb://your-mongodb-container:27017/LibreChat`
  - Or: `mongodb://host.docker.internal:27017/LibreChat` if MongoDB is on host

- **Security Keys**: Generate secure random keys:
  ```bash
  # Generate keys
  openssl rand -hex 16  # Use for CREDS_KEY, JWT_SECRET, JWT_REFRESH_SECRET
  openssl rand -hex 8   # Use for CREDS_IV
  ```

- **JUSTINA_API_KEY**: Your Justina API key for the MCP servers
- **MEILI_MASTER_KEY**: Secure key for Meilisearch
- **Domain settings**: Update DOMAIN_CLIENT and DOMAIN_SERVER for your domain

### 3. Build and Deploy
```bash
# Build the application
docker compose -f deploy-compose.yml build

# Start the services
docker compose -f deploy-compose.yml up -d
```

### 4. Check Status
```bash
# Check if services are running
docker compose -f deploy-compose.yml ps

# View logs
docker compose -f deploy-compose.yml logs -f
```

## Services Overview

The production deployment includes:

- **LibreChat-API**: Your custom-built API server (port 3080)
- **LibreChat-NGINX**: NGINX reverse proxy (ports 80/443)
- **chat-meilisearch**: Search service for LibreChat

## Important Notes

1. **MongoDB Connection**: Make sure your external MongoDB is accessible from the Docker containers
2. **Domain Configuration**: The nginx.conf is configured for `justina.pt` - update if needed
3. **SSL/HTTPS**: You'll need to configure SSL certificates for production
4. **Firewall**: Ensure ports 80 and 443 are open for web access
5. **Backups**: Set up regular backups of your data and configuration

## Troubleshooting

- If containers can't connect to MongoDB, check the MONGO_URI and network connectivity
- If build fails, ensure all dependencies are installed and the Dockerfile.multi is in the root
- For logs: `docker compose -f deploy-compose.yml logs [service-name]`

## Updating Configuration (librechat.yaml)

**Good news: No rebuild required!** The `librechat.yaml` file is bind-mounted, so configuration changes are applied immediately.

### Steps to Update Configuration:

1. **Edit the configuration file:**
   ```bash
   nano librechat.yaml
   # or
   vim librechat.yaml
   ```

2. **Apply changes (choose one):**
   ```bash
   # Option A: Restart only the API container (recommended)
   docker compose -f deploy-compose.yml restart api
   
   # Option B: Restart all services
   docker compose -f deploy-compose.yml restart
   ```

3. **Verify changes:**
   ```bash
   # Check container status
   docker compose -f deploy-compose.yml ps
   
   # Check logs for any configuration errors
   docker compose -f deploy-compose.yml logs api | tail -20
   ```

### When DO You Need to Rebuild?

You only need to rebuild (`docker compose -f deploy-compose.yml build`) when you change:
- **Source code** (JavaScript/TypeScript files)
- **Package dependencies** (package.json changes)
- **Dockerfile** modifications
- **Build-time environment variables**

### Configuration Tips:
- **Test locally first**: Ensure your YAML syntax is valid
- **Backup**: Keep backups of working configurations
- **Validation**: LibreChat will log errors if the YAML is invalid
- **Hot reloading**: Most config changes take effect immediately after container restart

## Updating Environment Variables (.env)

**No rebuild required!** Environment variables are loaded at container startup, so changes require a restart but not a rebuild.

### Steps to Update Environment Variables:

1. **Edit the .env file:**
   ```bash
   nano .env
   # or
   vim .env
   ```

2. **Apply changes by restarting containers:**
   ```bash
   # RECOMMENDED: Stop and start to ensure clean environment reload
   docker compose -f deploy-compose.yml down
   docker compose -f deploy-compose.yml up -d
   
   # Alternative: Restart (may not always reload .env changes properly)
   docker compose -f deploy-compose.yml restart
   ```
   
   **⚠️ Important**: The `restart` command doesn't always reload `.env` file changes properly. Use `down` + `up -d` for reliable environment variable updates.

3. **Verify changes:**
   ```bash
   # Check if containers are running
   docker compose -f deploy-compose.yml ps
   
   # Check specific environment variables inside container
   docker compose -f deploy-compose.yml exec api env | grep MONGO_URI
   docker compose -f deploy-compose.yml exec api env | grep JUSTINA_API_KEY
   
   # Check logs for any startup errors
   docker compose -f deploy-compose.yml logs api | tail -20
   ```

### Which Services Use .env Variables:

- **api**: Uses variables like `MONGO_URI`, `JUSTINA_API_KEY`, `JWT_SECRET`, etc.
- **meilisearch**: Uses variables like `MEILI_MASTER_KEY`

### Environment Variable Tips:
- **Validation**: Invalid environment variables may cause container startup failures
- **Secrets**: Never commit your `.env` file to version control
- **Backup**: Keep a secure backup of your production `.env` file
- **Testing**: Test changes in a development environment first if possible
- **CONFIG_PATH**: If you set `CONFIG_PATH`, use the container path `/app/librechat.yaml`, not the host path

### Common Issue: librechat.yaml not loading
If your `librechat.yaml` configuration isn't being applied:
1. Check if `CONFIG_PATH` is set correctly: `CONFIG_PATH="/app/librechat.yaml"`
2. Verify the file is mounted: `docker compose -f deploy-compose.yml exec api ls -la /app/librechat.yaml`
3. Check logs: `docker compose -f deploy-compose.yml logs api | grep -i config`

## Security Considerations

- Change all default passwords and keys
- Use strong, unique secrets for production
- Configure proper firewall rules
- Keep your system and Docker images updated
- Consider using Docker secrets for sensitive data 