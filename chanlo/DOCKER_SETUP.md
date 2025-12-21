# Docker Setup Guide

## Overview

This project includes a production-ready Docker setup with:
- ✅ Environment variables in `.env` file
- ✅ MySQL healthcheck for proper service dependencies
- ✅ Flyway database migrations
- ✅ Locked MySQL user permissions
- ✅ Multi-stage production Dockerfile

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file and update with your values:
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

### 3. Access the Application

- **Spring Boot App**: http://localhost:8080
- **MySQL Database**: localhost:3307

## File Structure

```
chanlo/
├── .env                    # Environment variables (not in git)
├── .env.example            # Template for environment variables
├── Dockerfile              # Production-ready multi-stage build
├── Dockerfile.prod         # Alternative production Dockerfile with healthcheck
├── docker-compose.yml      # Docker Compose configuration
├── docker/
│   └── mysql/
│       └── init/
│           └── 01-setup-user-permissions.sql  # MySQL user permissions
└── src/main/resources/
    └── db/
        └── migration/      # Flyway migration files
            ├── V1__Create_user_table.sql
            ├── V2__Create_event_table.sql
            └── V3__Create_hisab_table.sql
```

## Features

### Environment Variables
All sensitive configuration is stored in `.env` file:
- Database credentials
- Connection strings
- Server ports

### MySQL Healthcheck
The app service waits for MySQL to be healthy before starting, ensuring database is ready.

### Flyway Migrations
Database schema is managed through Flyway migrations:
- Version-controlled schema changes
- Automatic migration on startup
- Validation to prevent errors

### MySQL User Permissions
The application database user has limited permissions:
- ✅ Can only access the application database
- ✅ No global privileges
- ✅ No GRANT privileges
- ✅ Essential operations only (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER)

### Production Dockerfile
Multi-stage build for optimized production images:
- **Stage 1**: Build with Maven (includes all build tools)
- **Stage 2**: Runtime with JRE only (smaller image)
- Non-root user for security
- Optimized layer caching

## Development vs Production

### Development
Use the standard `Dockerfile` with docker-compose for local development.

### Production
For production deployments:
1. Use `Dockerfile.prod` (includes healthcheck)
2. Set strong passwords in `.env`
3. Use secrets management (not plain `.env` files)
4. Enable SSL/TLS for database connections
5. Configure proper backup strategies

## Troubleshooting

### Database Connection Issues
- Verify MySQL is healthy: `docker-compose ps`
- Check logs: `docker-compose logs mysql`
- Ensure `.env` file has correct credentials

### Migration Issues
- Check Flyway logs in application startup
- Verify migration files are in `src/main/resources/db/migration/`
- Ensure database user has CREATE/ALTER permissions

### Build Issues
- Clear Maven cache: `docker-compose build --no-cache`
- Check Java version matches (21)
- Verify all dependencies in `pom.xml`

## Commands

```bash
# Start services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f app
docker-compose logs -f mysql

# Rebuild without cache
docker-compose build --no-cache

# Remove volumes (clean database)
docker-compose down -v

# Execute commands in container
docker-compose exec app sh
docker-compose exec mysql mysql -u root -p
```

