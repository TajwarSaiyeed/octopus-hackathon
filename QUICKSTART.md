# Quick Start Guide - Octopus Hackathon

## 🚀 Fast Setup (5 minutes)

### 1. Prerequisites Check

```bash
# Check Docker
docker --version
# Required: >= 24.x

# Check Docker Compose
docker compose version
# Required: >= 2.x

# Check Node.js (for local development)
node --version
# Required: >= 24.10.0
```

### 2. Clone & Configure

```bash
# Navigate to project
cd /path/to/devpost_hackathon

# Environment is already configured in .env
# Review and modify if needed
cat .env
```

### 3. Start the Stack

```bash
# Start all services with Docker Compose
npm run docker:dev

# Or with pnpm (faster)
pnpm run docker:dev
```

**Wait for services to start** (~30-60 seconds)

### 4. Verify Services

```bash
# Check all containers are running
docker ps

# Expected output: 8 containers running
# - nginx-gateway
# - octopus-api
# - minio
# - prometheus
# - grafana
# - elasticsearch
# - kibana
# - minio-init (will exit after setup)
```

### 5. Access Services

Open in your browser:

| Service | URL | Credentials |
|---------|-----|-------------|
| **API (via Gateway)** | http://localhost:8080 | - |
| **API Documentation** | http://localhost:8080/docs | - |
| **Grafana Dashboards** | http://localhost:3001 | admin / admin123 |
| **Prometheus Metrics** | http://localhost:9090 | - |
| **Kibana Logs** | http://localhost:5601 | - |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin123 |

### 6. Test the API

```bash
# Health check
curl http://localhost:8080/health

# Response:
# {"status":"healthy","checks":{"storage":"ok"}}

# Check file availability
curl -X POST http://localhost:8080/v1/download/check \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}'

# Start a download (takes 10-120 seconds)
curl -X POST http://localhost:8080/v1/download/start \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}'
```

## 📊 View Metrics & Logs

### Grafana Dashboards

1. Open http://localhost:3001
2. Login: admin / admin123
3. Go to **Explore** → Select **Prometheus**
4. Query: `http_requests_total`

### Prometheus Metrics

1. Open http://localhost:9090
2. Click **Status** → **Targets** (verify all targets are UP)
3. Go to **Graph** tab
4. Query examples:
   - `http_request_duration_seconds`
   - `download_processing_duration_seconds`

### Kibana Logs

1. Open http://localhost:5601
2. Wait for Kibana to initialize (~1 minute)
3. Go to **Discover** → Create index pattern: `logs-*`
4. Set time field: `@timestamp`

### Container Logs

```bash
# All services
npm run docker:logs

# Specific service
docker logs octopus-hackathon-octopus-api-1 -f

# Follow API logs only
docker logs -f octopus-hackathon-octopus-api-1 2>&1 | grep -i "download"
```

## 🛠️ Common Tasks

### Stop Services

```bash
# Stop all containers
npm run docker:dev:down

# Or keep volumes (don't delete data)
docker compose -f docker/compose.dev.yml stop
```

### Restart a Single Service

```bash
# Restart API only
docker restart octopus-hackathon-octopus-api-1

# Rebuild and restart
docker compose -f docker/compose.dev.yml up -d --build octopus-api
```

### Clear All Data (Fresh Start)

```bash
# Stop and remove all containers + volumes
npm run docker:dev:down

# Start fresh
npm run docker:dev
```

### View MinIO Storage

1. Open http://localhost:9001
2. Login: minioadmin / minioadmin123
3. Click **Buckets** → `downloads`
4. View uploaded files

## 🐛 Troubleshooting

### Issue: Services Won't Start

```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :8080
lsof -i :3000
lsof -i :9000

# View logs for errors
docker compose -f docker/compose.dev.yml logs
```

### Issue: Can't Access API at localhost:3000

**Expected!** The API is not exposed directly. Use the gateway:

```bash
# ❌ This will not work
curl http://localhost:3000/health

# ✅ This will work
curl http://localhost:8080/health
```

### Issue: MinIO Bucket Not Created

```bash
# Check minio-init logs
docker logs octopus-hackathon-minio-init-1

# Manually create bucket
docker exec octopus-hackathon-minio-1 \
  mc mb /data/downloads --ignore-existing
```

### Issue: Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Warning: This removes all unused images and volumes!
```

### Issue: Elasticsearch Won't Start

```bash
# Check logs
docker logs octopus-hackathon-elasticsearch-1

# Common fix: Increase vm.max_map_count (Linux)
sudo sysctl -w vm.max_map_count=262144

# Make permanent
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

## 📈 Performance Tips

### Use pnpm (Faster than npm)

```bash
# Install pnpm globally
npm install -g pnpm

# Use pnpm for all commands
pnpm install
pnpm run docker:dev
```

### Optimize Docker

```bash
# Enable BuildKit (faster builds)
export DOCKER_BUILDKIT=1

# Use Docker Compose V2
docker compose version
# Should show: 2.x.x
```

### Monitor Resource Usage

```bash
# Check container stats
docker stats

# Check specific service
docker stats octopus-hackathon-octopus-api-1
```

## 🔄 Next Steps

1. **Explore API Documentation**
   - Open http://localhost:8080/docs
   - Try the interactive API explorer

2. **Set Up Grafana Dashboards**
   - Import pre-built dashboards
   - Create custom visualizations

3. **Configure Alerts**
   - Set up Prometheus alerts
   - Integrate with Slack/Discord

4. **Load Testing**
   - Use k6 or Apache Bench
   - Monitor performance metrics

5. **Production Deployment**
   - Review `DOCKER_ARCHITECTURE.md`
   - Update `.env` with production values
   - Use `docker/compose.prod.yml`

## 📚 Documentation

- [Full Architecture](DOCKER_ARCHITECTURE.md)
- [Project Overview](PROJECT_OVERVIEW.md)
- [README](README.md)

## 🆘 Get Help

If you encounter issues:

1. Check logs: `npm run docker:logs`
2. Review [DOCKER_ARCHITECTURE.md](DOCKER_ARCHITECTURE.md)
3. Check Docker status: `docker ps`
4. Restart services: `npm run docker:dev:down && npm run docker:dev`

---

**Happy Hacking! 🐙🚀**
