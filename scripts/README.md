# Test Scripts

This directory contains comprehensive test scripts for the Octopus Hackathon API.

## Test Scripts Overview

### 1. E2E Tests (`e2e-test.ts`)

**Purpose**: End-to-end tests for all API endpoints and functionality

**Features**:

- ✅ Root endpoint test
- ✅ Health check validation
- ✅ Security headers verification
- ✅ Download API endpoints (initiate, check, start)
- ✅ Request ID tracking
- ✅ Content-Type validation
- ✅ Method validation (405 errors)
- ✅ Rate limiting headers

**Usage**:

```bash
# Run via npm script (starts server automatically)
pnpm test:e2e

# Or run directly against a running server
node --experimental-transform-types scripts/e2e-test.ts http://localhost:8080
```

**Tests**: 29 test cases

---

### 2. Integration Tests (`integration-test.ts`)

**Purpose**: Test integration between all services (API, Prometheus, Grafana, Elasticsearch)

**Features**:

- ✅ API health checks
- ✅ Prometheus metrics validation
- ✅ API metrics endpoint verification
- ✅ Prometheus target health
- ✅ Prometheus query API
- ✅ Grafana health and datasources
- ✅ Elasticsearch cluster health
- ✅ Security headers validation

**Usage**:

```bash
# Start the full stack first
pnpm docker:dev

# Then run integration tests
pnpm test:integration

# Or with custom URLs
API_URL=http://localhost:8080 \
PROMETHEUS_URL=http://localhost:9090 \
GRAFANA_URL=http://localhost:3001 \
ELASTICSEARCH_URL=http://localhost:9200 \
pnpm test:integration
```

**Environment Variables**:

- `API_URL` - API gateway URL (default: http://localhost:8080)
- `PROMETHEUS_URL` - Prometheus URL (default: http://localhost:9090)
- `GRAFANA_URL` - Grafana URL (default: http://localhost:3001)
- `ELASTICSEARCH_URL` - Elasticsearch URL (default: http://localhost:9200)
- `MINIO_URL` - MinIO URL (default: http://localhost:9001)

---

### 3. Performance Tests (`performance-test.ts`)

**Purpose**: Test API performance, throughput, and rate limiting

**Features**:

- ✅ Concurrent request handling
- ✅ Response time metrics (min, max, avg, p50, p95, p99)
- ✅ Throughput measurement (requests/second)
- ✅ Rate limiting verification
- ✅ Endpoint-specific performance tests
- ✅ Success rate calculation

**Usage**:

```bash
# Start API first
pnpm start

# Then run performance tests
pnpm test:performance

# Or with custom settings
API_URL=http://localhost:8080 \
CONCURRENT_REQUESTS=10 \
TOTAL_REQUESTS=100 \
pnpm test:performance
```

**Environment Variables**:

- `API_URL` - API gateway URL (default: http://localhost:8080)
- `CONCURRENT_REQUESTS` - Number of concurrent requests (default: 10)
- `TOTAL_REQUESTS` - Total requests to send (default: 100)

**Output**:

- Response time percentiles (P50, P95, P99)
- Throughput (requests/second)
- Success/failure rates
- Rate limiting effectiveness

---

## Running All Tests

```bash
# Run all tests sequentially (requires services running)
pnpm test:all
```

This will run:

1. E2E tests (with automatic server start/stop)
2. Integration tests (requires Docker stack)
3. Performance tests (requires API running)

---

## CI/CD Pipeline

The GitHub Actions CI pipeline includes:

### 1. **Lint Job**

- ESLint validation
- Prettier formatting check

### 2. **E2E Tests Job**

- Runs all 29 E2E tests
- Tests API functionality without external dependencies

### 3. **Integration Tests Job**

- Starts MinIO, Prometheus, Grafana, Elasticsearch as services
- Tests full observability stack integration
- Validates metrics collection and dashboards

### 4. **Docker Compose Stack Test Job**

- Starts complete Docker Compose stack
- Tests gateway security (blocks direct API access)
- Validates all service health endpoints
- Ensures proper network isolation

### 5. **Performance Tests Job**

- Measures API performance
- Validates rate limiting
- Tests concurrent request handling

### 6. **Build Job**

- Builds production Docker image
- Validates Dockerfile
- Uses build cache for efficiency

---

## Test Coverage

### API Endpoints

- ✅ `GET /` - Root welcome message
- ✅ `GET /health` - Health check with storage validation
- ✅ `GET /metrics` - Prometheus metrics endpoint
- ✅ `POST /v1/download/initiate` - Initiate batch download
- ✅ `POST /v1/download/check` - Check file availability
- ✅ `POST /v1/download/start` - Start file download

### Security Features

- ✅ Request ID tracking
- ✅ Rate limiting (100 req/min default)
- ✅ Security headers (HSTS, X-Frame-Options, etc.)
- ✅ CORS headers
- ✅ Input validation
- ✅ Gateway isolation

### Observability

- ✅ Prometheus metrics collection
- ✅ Custom metrics (HTTP requests, durations, S3 checks)
- ✅ Grafana datasource configuration
- ✅ Elasticsearch health
- ✅ Target health monitoring

### Infrastructure

- ✅ Docker Compose stack
- ✅ Nginx gateway
- ✅ Network isolation
- ✅ Service health checks
- ✅ MinIO storage

---

## Test Results

All tests provide colored output:

- 🟢 **Green** - Passed
- 🔴 **Red** - Failed
- 🟡 **Yellow** - Info/Warning
- 🔵 **Blue** - Section headers

### Example Output

```
━━━ API Health Checks ━━━
✓ API health endpoint responds
✓ API status: healthy
✓ Storage check: ok

━━━ API Metrics Endpoint ━━━
✓ Metrics endpoint responds
✓ HTTP request counter present
✓ HTTP duration histogram present
✓ Download delay gauge present
✓ S3 availability counter present

==================================================
Test Summary:
  Total:  29
  Passed: 29
  Failed: 0
  Success Rate: 100.0%
==================================================

✓ All tests passed!
```

---

## Troubleshooting

### E2E Tests Fail

**Issue**: Server not starting

```bash
# Check if port 8080 is already in use
lsof -i :8080

# Kill existing process
kill -9 <PID>

# Try again
pnpm test:e2e
```

### Integration Tests Fail

**Issue**: Services not accessible

```bash
# Ensure Docker stack is running
docker compose -f docker/compose.dev.yml ps

# Check service logs
pnpm docker:logs

# Restart stack
pnpm docker:dev:down
pnpm docker:dev
```

### Performance Tests Show High Response Times

**Issue**: Slow responses (>500ms)

```bash
# Check CPU/memory usage
docker stats

# Check API logs for errors
pnpm docker:logs octopus-api

# Reduce concurrent requests
CONCURRENT_REQUESTS=5 TOTAL_REQUESTS=50 pnpm test:performance
```

### Rate Limiting Not Working

**Issue**: No 429 responses in tests

```bash
# Check nginx configuration
docker compose -f docker/compose.dev.yml exec nginx-gateway cat /etc/nginx/conf.d/default.conf

# Verify rate limit settings in .env
grep RATE_LIMIT .env
```

---

## Adding New Tests

### Add E2E Test

Edit `scripts/e2e-test.ts`:

```typescript
async function testNewFeature(): Promise<void> {
  logSection("New Feature Test");

  const response = await fetch(`${BASE_URL}/new-endpoint`);

  if (response.status === 200) {
    logPass("New feature works");
  } else {
    logFail("New feature", "200", String(response.status));
  }
}

// Add to main()
async function main(): Promise<void> {
  // ... existing tests
  await testNewFeature();
  // ...
}
```

### Add Integration Test

Edit `scripts/integration-test.ts`:

```typescript
async function testNewService(): Promise<void> {
  logSection("New Service Tests");

  try {
    const response = await fetch(`${NEW_SERVICE_URL}/health`);
    if (response.status === 200) {
      logPass("New service is healthy");
    }
  } catch (error) {
    logFail("New service test", "success", error.message);
  }
}

// Add to main()
await testNewService();
```

---

## Best Practices

1. **Run tests before committing**

   ```bash
   pnpm test:all
   ```

2. **Test against gateway, not direct API**

   ```bash
   # Good
   curl http://localhost:8080/health

   # Bad (should be blocked)
   curl http://localhost:3000/health
   ```

3. **Use environment variables for configuration**

   ```bash
   API_URL=https://api.example.com pnpm test:e2e
   ```

4. **Check CI logs for failures**
   - GitHub Actions shows detailed test output
   - Look for specific failed test cases
   - Check service logs if integration tests fail

5. **Keep tests fast**
   - Use small sample sizes in CI (TOTAL_REQUESTS=50)
   - Run full load tests locally only
   - Parallelize independent tests

---

## Resources

- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-6-testing-and-overall-quality-practices)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Prometheus Testing](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [Docker Compose Testing](https://docs.docker.com/compose/production/)

---

## License

MIT
