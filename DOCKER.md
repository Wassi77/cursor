# Docker Deployment Guide

Quick guide for running Movie Mimic with Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### Option 1: Root Dockerfile (All-in-One)

Build and run everything with a single Dockerfile:

```bash
# Build the image
docker build -t movie-mimic .

# Run the application
docker run -p 5173:80 -p 5000:5000 -v $(pwd)/data:/app/data -v $(pwd)/uploads:/app/uploads movie-mimic
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Option 2: Docker Compose (Recommended)

Using separate containers for better development:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Development vs Production

### Development Mode

```bash
docker-compose up
```

Hot reload enabled for both frontend and backend.

### Production Mode

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production containers
docker-compose -f docker-compose.prod.yml up -d
```

## Persistent Data

Data is persisted in Docker volumes:

- `movie-mimic-data`: Database and application data
- `movie-mimic-uploads`: Uploaded videos, recordings, exports
- `backend-node-modules`: Backend dependencies
- `frontend-node-modules`: Frontend dependencies

To backup data:

```bash
# Copy volumes
docker cp movie-mimic-data:/data ./backup/data
docker cp movie-mimic-uploads:/uploads ./backup/uploads
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild without cache
docker-compose build --no-cache

# Remove everything and start fresh
docker-compose down -v
docker-compose up --build
```

### Port already in use

Change ports in `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "5001:5000"  # Change 5000 to 5001
```

### Out of memory

Increase Docker memory limit or run fewer containers.

### FFmpeg not found

Should be pre-installed in Dockerfile. If issues:

```bash
# Verify FFmpeg
docker-compose exec backend ffmpeg -version
```

## Production Deployment

### Using Nginx Proxy

Create `docker-compose.prod.yml` with Nginx reverse proxy:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d
      - ./ssl:/etc/nginx/ssl
      - frontend-dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - movie-mimic-network

  backend:
    # ... backend service ...

  frontend:
    # ... frontend service (build-only stage) ...
```

### Health Checks

Docker Compose includes health checks for all services:

```bash
# Check service health
docker-compose ps

# View detailed health status
docker-compose logs
```

## Resource Limits

Limit resource usage in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

## Updates

To update the application:

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose down
docker-compose build
docker-compose up -d
```

## Clean Up

Remove all Docker artifacts:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker rmi movie-mimic

# Remove build cache
docker builder prune -a
```

## Monitoring

View resource usage:

```bash
# Container stats
docker stats

# Disk usage
docker system df

# View logs in real-time
docker-compose logs -f
```
