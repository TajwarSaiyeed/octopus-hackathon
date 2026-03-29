#!/bin/bash
# Post-create setup script for GitHub Codespaces

echo "🐙 Setting up Octopus Hackathon in Codespaces..."

# Install pnpm
echo "📦 Installing pnpm..."
npm install -g pnpm

# Install dependencies
echo "📦 Installing Node.js dependencies..."
pnpm install --frozen-lockfile

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && pnpm install --frozen-lockfile && cd ..

# Create .env file for Codespaces
echo "🔧 Creating .env file..."
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3000
GATEWAY_PORT=8080

# MinIO Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin123
S3_BUCKET_NAME=downloads
S3_FORCE_PATH_STYLE=true

# Internal Service URLs (Docker network)
S3_ENDPOINT=http://minio:9000
ELASTICSEARCH_URL=http://elasticsearch:9200
PROMETHEUS_URL=http://prometheus:9090

# Prometheus Configuration
PROMETHEUS_PORT=9090

# Grafana Configuration
GRAFANA_PORT=3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123

# Elasticsearch Configuration
ELASTICSEARCH_PORT=9200
ES_JAVA_OPTS=-Xms512m -Xmx512m

# Kibana Configuration
KIBANA_PORT=5601

# Observability
SENTRY_DSN=

# Rate Limiting & Timeouts
REQUEST_TIMEOUT_MS=30000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=*

# Download Delay Simulation (reduced for Codespaces)
DOWNLOAD_DELAY_ENABLED=true
DOWNLOAD_DELAY_MIN_MS=5000
DOWNLOAD_DELAY_MAX_MS=30000

# Security
JWT_SECRET=your-secret-key-change-in-production

# Jaeger Configuration
JAEGER_ENDPOINT=http://jaeger:4318

# Redis Configuration
REDIS_URL=redis://redis:6379
EOF

echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm run docker:dev"
echo "   2. Wait 60 seconds for all services to start"
echo "   3. Access the gateway at the forwarded port 8080"
echo ""
echo "📋 Available services (after starting):"
echo "   - Gateway: http://localhost:8080"
echo "   - API Docs: http://localhost:8080/docs"
echo "   - MinIO Console: http://localhost:9001"
echo "   - Grafana: http://localhost:3001"
echo "   - Jaeger UI: http://localhost:16686"
echo "   - Kibana: http://localhost:5601"
echo "   - Prometheus: http://localhost:9090"
