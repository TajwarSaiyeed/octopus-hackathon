# Docker Setup Guide

This guide explains how to run the Octopus Hackathon API with the full observability stack.

## Services Included

### Core Services
- **Octopus API** (Port 3000) - Main application API
- **MinIO** (Ports 9000, 9001) - S3-compatible object storage

### Observability Stack
- **Prometheus** (Port 9090) - Metrics collection and time-series database
- **Grafana** (Port 3001) - Visualization dashboards
- **Elasticsearch** (Port 9200) - Log aggregation and search
- **Kibana** (Port 5601) - Log visualization

## Quick Start

### Development Mode

```bash
# Start all services
npm run docker:dev

# Or directly with docker compose
docker compose -f docker/compose.dev.yml up --build
```

### Production Mode

```bash
# Start all services in production mode
npm run docker:prod

# Or directly with docker compose
docker compose -f docker/compose.prod.yml up --build -d
```

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:3000 | - |
| API Docs | http://localhost:3000/docs | - |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin/admin |
| Elasticsearch | http://localhost:9200 | - |
| Kibana | http://localhost:5601 | - |

## Verifying the Setup

### 1. Check API Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "storage": "ok"
  }
}
```

### 2. Verify MinIO

- Open http://localhost:9001
- Login with `minioadmin/minioadmin`
- Check that `downloads` bucket exists

### 3. Check Prometheus

- Open http://localhost:9090
- Go to Status → Targets
- Verify `octopus-api` and `minio` targets are UP

### 4. Access Grafana

- Open http://localhost:3001
- Login with `admin/admin`
- Verify Prometheus and Elasticsearch datasources are configured

### 5. Test Elasticsearch

```bash
curl http://localhost:9200/_cluster/health
```

## Volume Management

Persistent data is stored in Docker volumes:

```bash
# List volumes
docker volume ls | grep octopus-hackathon

# Remove all volumes (WARNING: deletes all data)
docker compose -f docker/compose.dev.yml down -v
```

## Troubleshooting

### Service Not Starting

Check logs:
```bash
docker compose -f docker/compose.dev.yml logs [service-name]
```

### Port Already in Use

Stop conflicting services or change ports in the compose file.

### MinIO Bucket Not Created

Manually create bucket:
```bash
docker exec -it octopus-hackathon-minio-1 mc mb /data/downloads
```

### Elasticsearch Memory Issues

Increase Docker memory allocation to at least 4GB.

## Stopping Services

```bash
# Stop all services
docker compose -f docker/compose.dev.yml down

# Stop and remove volumes
docker compose -f docker/compose.dev.yml down -v
```

## Configuration Files

- `prometheus.yml` - Prometheus scrape configuration
- `grafana-datasources.yml` - Grafana datasource provisioning
- `.env` - Environment variables for all services
