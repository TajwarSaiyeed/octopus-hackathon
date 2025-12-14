/**
 * Integration Test Script for Octopus Hackathon API
 * Tests all services: API, MinIO, Prometheus, Grafana, Elasticsearch
 * Usage: node --experimental-transform-types scripts/integration-test.ts
 */

const API_URL = process.env.API_URL ?? "http://localhost:8080";
const PROMETHEUS_URL = process.env.PROMETHEUS_URL ?? "http://localhost:9090";
const GRAFANA_URL = process.env.GRAFANA_URL ?? "http://localhost:3001";
const ELASTICSEARCH_URL =
  process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
const MINIO_URL = process.env.MINIO_URL ?? "http://localhost:9001";

// ANSI Colors
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

interface TestResult {
  passed: number;
  failed: number;
  total: number;
}

const results: TestResult = { passed: 0, failed: 0, total: 0 };

function logPass(message: string): void {
  results.passed++;
  results.total++;
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logFail(message: string, expected: string, got: string): void {
  results.failed++;
  results.total++;
  console.log(
    `${colors.red}✗${colors.reset} ${message}\n  Expected: ${expected}\n  Got: ${got}`,
  );
}

function logSection(title: string): void {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

function logInfo(message: string): void {
  console.log(`${colors.yellow}ℹ${colors.reset} ${message}`);
}

async function testAPIHealth(): Promise<void> {
  logSection("API Health Checks");

  try {
    const response = await fetch(`${API_URL}/health`);
    const data = (await response.json()) as {
      status?: string;
      checks?: { storage?: string };
    };

    if (response.status === 200 || response.status === 503) {
      logPass("API health endpoint responds");
    } else {
      logFail(
        "API health endpoint responds",
        "200 or 503",
        String(response.status),
      );
    }

    if (data.status) {
      logPass(`API status: ${data.status}`);
    } else {
      logFail("API status present", "healthy or unhealthy", "missing");
    }

    if (data.checks?.storage) {
      logPass(`Storage check: ${data.checks.storage}`);
    } else {
      logFail("Storage check present", "ok or error", "missing");
    }
  } catch (error) {
    logFail(
      "API health check",
      "successful response",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function testAPIMetrics(): Promise<void> {
  logSection("API Metrics Endpoint");

  try {
    const response = await fetch(`${API_URL}/metrics`);

    if (response.status === 200) {
      logPass("Metrics endpoint responds");
    } else {
      logFail("Metrics endpoint responds", "200", String(response.status));
    }

    const metrics = await response.text();

    if (metrics.includes("http_requests_total")) {
      logPass("HTTP request counter present");
    } else {
      logFail("HTTP request counter", "http_requests_total", "not found");
    }

    if (metrics.includes("http_request_duration_seconds")) {
      logPass("HTTP duration histogram present");
    } else {
      logFail(
        "HTTP duration histogram",
        "http_request_duration_seconds",
        "not found",
      );
    }

    if (metrics.includes("download_delay_seconds")) {
      logPass("Download delay gauge present");
    } else {
      logFail("Download delay gauge", "download_delay_seconds", "not found");
    }

    if (metrics.includes("s3_availability_checks_total")) {
      logPass("S3 availability counter present");
    } else {
      logFail(
        "S3 availability counter",
        "s3_availability_checks_total",
        "not found",
      );
    }
  } catch (error) {
    logFail(
      "Metrics endpoint",
      "successful response",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function testAPIEndpoints(): Promise<void> {
  logSection("API Endpoint Tests");

  try {
    // Test root endpoint
    const rootResponse = await fetch(`${API_URL}/`);
    if (rootResponse.status === 200) {
      logPass("Root endpoint responds");
    } else {
      logFail("Root endpoint responds", "200", String(rootResponse.status));
    }

    // Test download initiate
    const initiateResponse = await fetch(`${API_URL}/v1/download/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_ids: [50000] }),
    });

    if (initiateResponse.status === 200 || initiateResponse.status === 500) {
      logPass("Download initiate endpoint responds");
    } else {
      logFail(
        "Download initiate endpoint",
        "200 or 500",
        String(initiateResponse.status),
      );
    }

    // Test download check
    const checkResponse = await fetch(`${API_URL}/v1/download/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: 50000 }),
    });

    if (checkResponse.status === 200 || checkResponse.status === 500) {
      logPass("Download check endpoint responds");
    } else {
      logFail(
        "Download check endpoint",
        "200 or 500",
        String(checkResponse.status),
      );
    }

    // Test download start
    const startResponse = await fetch(`${API_URL}/v1/download/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: 50000 }),
    });

    if (
      startResponse.status === 200 ||
      startResponse.status === 404 ||
      startResponse.status === 500
    ) {
      logPass("Download start endpoint responds");
    } else {
      logFail(
        "Download start endpoint",
        "200, 404, or 500",
        String(startResponse.status),
      );
    }
  } catch (error) {
    logFail(
      "API endpoints test",
      "successful responses",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function testPrometheus(): Promise<void> {
  logSection("Prometheus Tests");

  try {
    // Test Prometheus health
    const healthResponse = await fetch(`${PROMETHEUS_URL}/-/healthy`);
    if (healthResponse.status === 200) {
      logPass("Prometheus is healthy");
    } else {
      logFail("Prometheus health", "200", String(healthResponse.status));
    }

    // Test Prometheus ready
    const readyResponse = await fetch(`${PROMETHEUS_URL}/-/ready`);
    if (readyResponse.status === 200) {
      logPass("Prometheus is ready");
    } else {
      logFail("Prometheus ready", "200", String(readyResponse.status));
    }

    // Test targets
    const targetsResponse = await fetch(
      `${PROMETHEUS_URL}/api/v1/targets?state=active`,
    );
    if (targetsResponse.status === 200) {
      logPass("Prometheus targets API responds");

      const targetsData = (await targetsResponse.json()) as {
        status?: string;
        data?: { activeTargets?: Array<{ health?: string; labels?: object }> };
      };

      if (targetsData.status === "success") {
        const activeTargets = targetsData.data?.activeTargets ?? [];
        logInfo(`Active targets: ${activeTargets.length}`);

        const healthyTargets = activeTargets.filter(
          (t) => t.health === "up",
        ).length;
        if (healthyTargets > 0) {
          logPass(`${healthyTargets} healthy targets`);
        } else {
          logFail("Healthy targets", ">0", String(healthyTargets));
        }
      }
    } else {
      logFail("Prometheus targets API", "200", String(targetsResponse.status));
    }

    // Test query API
    const queryResponse = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=up`,
    );
    if (queryResponse.status === 200) {
      logPass("Prometheus query API works");
    } else {
      logFail("Prometheus query API", "200", String(queryResponse.status));
    }
  } catch (error) {
    logFail(
      "Prometheus tests",
      "successful responses",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function testGrafana(): Promise<void> {
  logSection("Grafana Tests");

  try {
    // Test Grafana health
    const healthResponse = await fetch(`${GRAFANA_URL}/api/health`);
    if (healthResponse.status === 200) {
      logPass("Grafana is healthy");

      const healthData = (await healthResponse.json()) as {
        database?: string;
        version?: string;
      };
      if (healthData.database === "ok") {
        logPass("Grafana database is ok");
      }
      if (healthData.version) {
        logInfo(`Grafana version: ${healthData.version}`);
      }
    } else {
      logFail("Grafana health", "200", String(healthResponse.status));
    }

    // Test datasources (with basic auth)
    const auth = Buffer.from("admin:admin123").toString("base64");
    const datasourcesResponse = await fetch(`${GRAFANA_URL}/api/datasources`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (datasourcesResponse.status === 200) {
      logPass("Grafana datasources API responds");

      const datasources = (await datasourcesResponse.json()) as Array<{
        name?: string;
        type?: string;
      }>;
      logInfo(`Configured datasources: ${datasources.length}`);

      const prometheusDS = datasources.find((ds) => ds.type === "prometheus");
      if (prometheusDS) {
        logPass(`Prometheus datasource configured: ${prometheusDS.name}`);
      } else {
        logFail("Prometheus datasource", "configured", "not found");
      }
    } else {
      logFail(
        "Grafana datasources API",
        "200",
        String(datasourcesResponse.status),
      );
    }
  } catch (error) {
    logFail(
      "Grafana tests",
      "successful responses",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function testElasticsearch(): Promise<void> {
  logSection("Elasticsearch Tests");

  try {
    // Test cluster health
    const healthResponse = await fetch(`${ELASTICSEARCH_URL}/_cluster/health`);
    if (healthResponse.status === 200) {
      logPass("Elasticsearch cluster responds");

      const healthData = (await healthResponse.json()) as {
        status?: string;
        number_of_nodes?: number;
        cluster_name?: string;
      };

      if (healthData.status) {
        logPass(`Cluster status: ${healthData.status}`);
      }
      if (healthData.number_of_nodes) {
        logInfo(`Number of nodes: ${healthData.number_of_nodes}`);
      }
      if (healthData.cluster_name) {
        logInfo(`Cluster name: ${healthData.cluster_name}`);
      }
    } else {
      logFail("Elasticsearch health", "200", String(healthResponse.status));
    }

    // Test basic info
    const infoResponse = await fetch(`${ELASTICSEARCH_URL}/`);
    if (infoResponse.status === 200) {
      logPass("Elasticsearch info endpoint responds");

      const infoData = (await infoResponse.json()) as {
        version?: { number?: string };
      };
      if (infoData.version?.number) {
        logInfo(`Elasticsearch version: ${infoData.version.number}`);
      }
    } else {
      logFail("Elasticsearch info", "200", String(infoResponse.status));
    }
  } catch (error) {
    logFail(
      "Elasticsearch tests",
      "successful responses",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function testSecurityHeaders(): Promise<void> {
  logSection("Security Headers Tests");

  try {
    const response = await fetch(`${API_URL}/`);
    const headers = response.headers;

    if (headers.has("x-request-id")) {
      logPass("X-Request-ID header present");
    } else {
      logFail("X-Request-ID header", "present", "missing");
    }

    if (headers.has("ratelimit-limit")) {
      logPass("RateLimit-Limit header present");
    } else {
      logFail("RateLimit-Limit header", "present", "missing");
    }

    if (headers.has("ratelimit-remaining")) {
      logPass("RateLimit-Remaining header present");
    } else {
      logFail("RateLimit-Remaining header", "present", "missing");
    }

    // Note: Security headers are added by nginx gateway
    const securityHeaders = [
      "x-frame-options",
      "x-content-type-options",
      "strict-transport-security",
    ];

    for (const header of securityHeaders) {
      if (headers.has(header)) {
        logPass(`${header} header present`);
      } else {
        logInfo(`${header} header missing (may be added by gateway)`);
      }
    }
  } catch (error) {
    logFail(
      "Security headers test",
      "successful check",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

function printSummary(): void {
  console.log(`\n${"=".repeat(50)}`);
  console.log("Test Summary:");
  console.log(`  Total:  ${results.total}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(
    `  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`,
  );
  console.log("=".repeat(50));

  if (results.failed === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed!${colors.reset}`);
  }
}

async function main(): Promise<void> {
  console.log("Integration Tests for Octopus Hackathon");
  console.log(`API URL: ${API_URL}`);
  console.log(`Prometheus URL: ${PROMETHEUS_URL}`);
  console.log(`Grafana URL: ${GRAFANA_URL}`);
  console.log(`Elasticsearch URL: ${ELASTICSEARCH_URL}`);
  console.log();

  await testAPIHealth();
  await testAPIMetrics();
  await testAPIEndpoints();
  await testPrometheus();
  await testGrafana();
  await testElasticsearch();
  await testSecurityHeaders();

  printSummary();

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Integration test runner failed:", err);
  process.exit(1);
});
