# Docker Architecture - Octopus Hackathon

## 🏗️ Architecture Overview

This project implements a **secure, production-ready microservices architecture** with:

- **Nginx Gateway** as the only public entry point
- **Internal network isolation** for all backend services
- **Environment-based configuration** (no hardcoded values)
- **Comprehensive observability stack** (Prometheus, Grafana, Elasticsearch, Kibana)
- **S3-compatible storage** with MinIO

## 🌐 Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUBLIC INTERNET                          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ Port 8080
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx Gateway                               │
│  • Rate Limiting                                                 │
│  • Security Headers                                              │
│  • Load Balancing                                                │
│  • Request Routing                                               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                         gateway-network
                                 │
┌────────────────────────────────┴────────────────────────────────┐
│                    Internal Network (Isolated)                   │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Octopus API  │◄───┤   MinIO      │◄───┤ Prometheus   │      │
│  │  (Port 3000) │    │ (S3 Storage) │    │  (Metrics)   │      │
│  └──────┬───────┘    └──────────────┘    └──────────────┘      │
│         │                                                        │
│         │                                                        │
│  ┌──────▼───────┐    ┌──────────────┐    ┌──────────────┐      │
│  │Elasticsearch │◄───┤   Grafana    │    │   Kibana     │      │
│  │   (Logs)     │    │(Dashboards)  │    │(Log Viewer)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## 🔒 Security Features

### 1. Network Isolation

- **Gateway Network**: Only nginx gateway can communicate with external clients
- **Internal Network**: All backend services isolated (production: `internal: true`)
- **No Direct API Access**: API only accessible through nginx gateway
- **Service-to-Service Communication**: Internal services use Docker DNS

### 2. Port Exposure Strategy

| Service | External Port | Internal Port | Access |
|---------|---------------|---------------|---------|
| Nginx Gateway | 8080 | 8080 | **Public** |
| Octopus API | ❌ None | 3000 | **Internal Only** |
| MinIO | ❌ None | 9000 | **Internal Only** |
| MinIO Console | 9001 | 9001 | **Admin Only (Dev)** |
| Prometheus | 9090 (Dev) | 9090 | **Metrics (Dev)** |
| Grafana | 3001 (Dev) | 3000 | **Dashboards (Dev)** |
| Elasticsearch | ❌ None | 9200 | **Internal Only** |
| Kibana | 5601 (Dev) | 5601 | **Logs (Dev)** |

### 3. Environment-Based Configuration

**All sensitive data and URLs are loaded from `.env` file:**

```env
# No hardcoded credentials in code
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
S3_ACCESS_KEY_ID=${MINIO_ROOT_USER}
S3_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}

# Internal service URLs (Docker network)
S3_ENDPOINT=http://minio:9000
ELASTICSEARCH_URL=http://elasticsearch:9200
PROMETHEUS_URL=http://prometheus:9090
```

## 📊 Observability Stack

### Metrics Flow (Prometheus)

```
API Metrics → Prometheus → Grafana Dashboards
   │             │              │
   │             ▼              ▼
   │      Time Series DB    Visualization
   │                            │
   └────────────────────────────┘
              Alerts
```

**Prometheus scrapes metrics from:**
- Octopus API (`/metrics` endpoint)
- MinIO (cluster metrics)
- Elasticsearch (cluster health)

### Logging Flow (ELK Stack)

```
Application Logs → Elasticsearch → Kibana
      │                  │            │
      │                  ▼            ▼
      │           Index & Store   Search & View
      │                  │            │
      └──────────────────┴────────────┘
            Structured JSON Logs
```

**Log format:**
```json
{
  "timestamp": "2025-12-14T10:00:00Z",
  "level": "info",
  "request_id": "abc-123",
  "service": "octopus-api",
  "message": "Download started",
  "file_id": 70000
}
```

## 🚀 Getting Started

### Prerequisites

```bash
# Install Docker and Docker Compose
docker --version  # >= 24.x
docker compose version  # >= 2.x

# Optional: Install pnpm for faster package management
npm install -g pnpm
```

### Setup

1. **Clone and configure:**

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Ensure Docker is running
docker ps
```

2. **Start Development Stack:**

```bash
# Start all services
pnpm run docker:dev

# Or with npm
npm run docker:dev
```

3. **Access Services:**

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Gateway** | http://localhost:8080 | - |
| **API Docs** | http://localhost:8080/docs | - |
| **Grafana** | http://localhost:3001 | admin / admin123 |
| **Prometheus** | http://localhost:9090 | - |
| **Kibana** | http://localhost:5601 | - |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin123 |

4. **Test API (via Gateway):**

```bash
# Health check
curl http://localhost:8080/health

# Start download (will take 10-120s)
curl -X POST http://localhost:8080/v1/download/start \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}'
```

5. **View Logs:**

```bash
# All services
pnpm run docker:logs

# Specific service
docker logs octopus-hackathon-octopus-api-1 -f
```

6. **Stop Services:**

```bash
# Stop all containers
pnpm run docker:dev:down

# Stop and remove volumes (clean slate)
docker compose -f docker/compose.dev.yml down -v
```

## 🏭 Production Deployment

### Differences from Development

1. **Complete Network Isolation:**
   ```yaml
   internal-network:
     internal: true  # No external access at all
   ```

2. **No Exposed Ports:**
   - Only nginx gateway is exposed (port 8080)
   - All internal services use `expose` instead of `ports`

3. **Security Hardening:**
   - Change all default passwords in `.env`
   - Enable HTTPS on nginx gateway
   - Set strong JWT secrets
   - Enable Elasticsearch security (`xpack.security.enabled=true`)

4. **Resource Limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
       reservations:
         memory: 512M
   ```

### Production Deployment Steps

```bash
# 1. Configure production environment
cp .env .env.production
# Edit .env.production with production values

# 2. Update nginx for HTTPS (optional)
# Add SSL certificates to docker/nginx.conf

# 3. Start production stack
docker compose -f docker/compose.prod.yml up -d

# 4. Verify all services are healthy
docker ps
docker compose -f docker/compose.prod.yml ps

# 5. Check logs
docker compose -f docker/compose.prod.yml logs -f
```

## 🔧 Configuration Files

### Nginx Gateway (`docker/nginx.conf`)
- Rate limiting configuration
- Proxy timeouts for long-running requests
- Security headers
- Internal metrics endpoint (restricted)

### Prometheus (`docker/prometheus.yml`)
- Scrape configurations for all services
- Retention policies
- Alert rules (to be added)

### Grafana (`docker/grafana-datasources.yml`)
- Pre-configured Prometheus datasource
- Pre-configured Elasticsearch datasource
- Auto-provisioning on startup

## 📈 Monitoring & Alerts

### Key Metrics to Monitor

**API Metrics:**
- `http_requests_total` - Total requests by endpoint
- `http_request_duration_seconds` - Request latency
- `download_processing_duration_seconds` - Download processing time
- `active_downloads` - Current in-progress downloads

**Infrastructure Metrics:**
- MinIO storage usage
- Elasticsearch cluster health
- Container CPU/Memory usage
- Network traffic

### Setting Up Alerts

Add alert rules to `docker/prometheus-alerts.yml`:

```yaml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"
```

## 🧪 Development Workflow

### Using pnpm (Recommended)

```bash
# Install dependencies
pnpm install

# Start local dev (no Docker)
pnpm dev

# Start with Docker
pnpm run docker:dev

# Run tests
pnpm test:e2e

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
```

### Hot Reload

Development mode includes hot reload:
- Changes to `src/` directory auto-restart the API
- No need to rebuild Docker image

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose -f docker/compose.dev.yml logs

# Check specific service
docker logs octopus-hackathon-octopus-api-1

# Check network
docker network ls
docker network inspect octopus-hackathon_internal-network
```

### Can't Access API Directly (Expected!)

❌ **This will fail:**
```bash
curl http://localhost:3000/health
```

✅ **This will work:**
```bash
curl http://localhost:8080/health
```

**Reason:** API port is not exposed. All access must go through nginx gateway.

### MinIO Bucket Not Created

```bash
# Check minio-init logs
docker logs octopus-hackathon-minio-init-1

# Manually create bucket
docker exec -it octopus-hackathon-minio-1 mc mb /data/downloads
```

### Prometheus Not Scraping Metrics

```bash
# Check Prometheus targets
open http://localhost:9090/targets

# Check if API exposes metrics
curl http://localhost:8080/metrics
```

## 📚 Additional Resources

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Prometheus Getting Started](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [Grafana Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [MinIO Admin Guide](https://min.io/docs/minio/linux/index.html)

## 🔄 Future Enhancements

- [ ] Add gRPC for internal service communication
- [ ] Implement GraphQL gateway
- [ ] Add Redis for caching
- [ ] Implement BullMQ for job queue
- [ ] Add Traefik as alternative gateway
- [ ] Implement service mesh (Istio/Linkerd)
- [ ] Add distributed tracing (Jaeger/Tempo)
- [ ] Implement HashiCorp Vault for secrets

---

**Last Updated:** December 14, 2025  
**Architecture Version:** 2.0.0
