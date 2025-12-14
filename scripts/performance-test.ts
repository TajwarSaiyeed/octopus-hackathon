/**
 * Performance Test Script for Octopus Hackathon API
 * Tests API performance, rate limiting, and concurrent requests
 * Usage: node --experimental-transform-types scripts/performance-test.ts
 */

const API_URL = process.env.API_URL ?? "http://localhost:8080";
const CONCURRENT_REQUESTS = Number.parseInt(
  process.env.CONCURRENT_REQUESTS ?? "10",
  10,
);
const TOTAL_REQUESTS = Number.parseInt(process.env.TOTAL_REQUESTS ?? "100", 10);

// ANSI Colors
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m",
};

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimited: number;
  minResponseTime: number;
  maxResponseTime: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  responseTimes: number[];
}

function logSection(title: string): void {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

function logInfo(message: string): void {
  console.log(`${colors.yellow}ℹ${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message: string): void {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

async function makeRequest(endpoint: string): Promise<{
  success: boolean;
  responseTime: number;
  statusCode: number;
  rateLimited: boolean;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    const responseTime = Date.now() - startTime;

    return {
      success: response.ok,
      responseTime,
      statusCode: response.status,
      rateLimited: response.status === 429,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      statusCode: 0,
      rateLimited: false,
    };
  }
}

async function testConcurrentRequests(): Promise<PerformanceMetrics> {
  logSection(`Concurrent Request Test (${CONCURRENT_REQUESTS} concurrent)`);
  logInfo(
    `Sending ${TOTAL_REQUESTS} total requests with ${CONCURRENT_REQUESTS} concurrent...`,
  );

  const metrics: PerformanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimited: 0,
    minResponseTime: Number.POSITIVE_INFINITY,
    maxResponseTime: 0,
    avgResponseTime: 0,
    p50ResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    requestsPerSecond: 0,
    responseTimes: [],
  };

  const startTime = Date.now();
  const promises: Promise<void>[] = [];

  // Send requests in batches
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_REQUESTS) {
    const batch = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i);

    const batchPromises = Array.from({ length: batch }, async () => {
      const result = await makeRequest("/health");
      metrics.totalRequests++;
      metrics.responseTimes.push(result.responseTime);

      if (result.success) {
        metrics.successfulRequests++;
      } else {
        metrics.failedRequests++;
      }

      if (result.rateLimited) {
        metrics.rateLimited++;
      }

      metrics.minResponseTime = Math.min(
        metrics.minResponseTime,
        result.responseTime,
      );
      metrics.maxResponseTime = Math.max(
        metrics.maxResponseTime,
        result.responseTime,
      );
    });

    promises.push(...batchPromises);
    await Promise.all(batchPromises);
  }

  await Promise.all(promises);

  const totalTime = (Date.now() - startTime) / 1000; // Convert to seconds
  metrics.requestsPerSecond = metrics.totalRequests / totalTime;

  // Calculate average
  metrics.avgResponseTime =
    metrics.responseTimes.reduce((a, b) => a + b, 0) /
    metrics.responseTimes.length;

  // Calculate percentiles
  const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
  metrics.p50ResponseTime = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  metrics.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  metrics.p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

  return metrics;
}

async function testRateLimiting(): Promise<void> {
  logSection("Rate Limiting Test");
  logInfo("Sending rapid requests to trigger rate limiting...");

  let rateLimitedCount = 0;
  let successCount = 0;
  const requests = 50; // Send 50 rapid requests

  const promises = Array.from({ length: requests }, async () => {
    const result = await makeRequest("/");
    if (result.rateLimited) {
      rateLimitedCount++;
    } else if (result.success) {
      successCount++;
    }
  });

  await Promise.all(promises);

  logInfo(`Total requests: ${requests}`);
  logInfo(`Successful: ${successCount}`);
  logInfo(`Rate limited (429): ${rateLimitedCount}`);

  if (rateLimitedCount > 0) {
    logSuccess("Rate limiting is working");
  } else {
    logError("Rate limiting might not be working properly");
  }
}

async function testEndpointPerformance(
  endpoint: string,
  method: string = "GET",
  body?: object,
): Promise<{
  endpoint: string;
  avgResponseTime: number;
  successRate: number;
}> {
  const iterations = 10;
  const results: { success: boolean; responseTime: number }[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    try {
      const options: RequestInit = {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_URL}${endpoint}`, options);
      const responseTime = Date.now() - startTime;

      results.push({
        success: response.ok || response.status === 404, // 404 is expected for some endpoints
        responseTime,
      });
    } catch {
      results.push({
        success: false,
        responseTime: Date.now() - startTime,
      });
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const avgResponseTime =
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const successRate =
    (results.filter((r) => r.success).length / results.length) * 100;

  return { endpoint, avgResponseTime, successRate };
}

async function testAllEndpoints(): Promise<void> {
  logSection("Endpoint Performance Tests");

  const endpoints = [
    { path: "/", method: "GET" },
    { path: "/health", method: "GET" },
    { path: "/metrics", method: "GET" },
    {
      path: "/v1/download/initiate",
      method: "POST",
      body: { file_ids: [50000] },
    },
    {
      path: "/v1/download/check",
      method: "POST",
      body: { file_id: 50000 },
    },
    {
      path: "/v1/download/start",
      method: "POST",
      body: { file_id: 50000 },
    },
  ];

  const results: Array<{
    endpoint: string;
    avgResponseTime: number;
    successRate: number;
  }> = [];

  for (const endpoint of endpoints) {
    const result = await testEndpointPerformance(
      endpoint.path,
      endpoint.method,
      endpoint.body,
    );
    results.push(result);
  }

  console.log("\nResults:");
  console.log("─".repeat(70));
  console.log(
    `${"Endpoint".padEnd(35)} ${"Avg Response Time".padEnd(20)} Success Rate`,
  );
  console.log("─".repeat(70));

  for (const result of results) {
    const timeColor =
      result.avgResponseTime < 100
        ? colors.green
        : result.avgResponseTime < 500
          ? colors.yellow
          : colors.red;

    const successColor =
      result.successRate >= 90
        ? colors.green
        : result.successRate >= 70
          ? colors.yellow
          : colors.red;

    console.log(
      `${result.endpoint.padEnd(35)} ${timeColor}${result.avgResponseTime.toFixed(2)}ms${colors.reset}${"".padEnd(20 - result.avgResponseTime.toFixed(2).length - 2)} ${successColor}${result.successRate.toFixed(1)}%${colors.reset}`,
    );
  }
  console.log("─".repeat(70));
}

function printMetrics(metrics: PerformanceMetrics): void {
  console.log("\nPerformance Metrics:");
  console.log("─".repeat(50));
  console.log(`Total Requests:       ${metrics.totalRequests}`);
  console.log(
    `${colors.green}Successful:${colors.reset}           ${metrics.successfulRequests}`,
  );
  console.log(
    `${colors.red}Failed:${colors.reset}               ${metrics.failedRequests}`,
  );
  console.log(
    `${colors.yellow}Rate Limited:${colors.reset}         ${metrics.rateLimited}`,
  );
  console.log("─".repeat(50));
  console.log(`${colors.magenta}Response Times:${colors.reset}`);
  console.log(`  Min:                ${metrics.minResponseTime.toFixed(2)}ms`);
  console.log(`  Max:                ${metrics.maxResponseTime.toFixed(2)}ms`);
  console.log(`  Avg:                ${metrics.avgResponseTime.toFixed(2)}ms`);
  console.log(`  P50 (median):       ${metrics.p50ResponseTime.toFixed(2)}ms`);
  console.log(`  P95:                ${metrics.p95ResponseTime.toFixed(2)}ms`);
  console.log(`  P99:                ${metrics.p99ResponseTime.toFixed(2)}ms`);
  console.log("─".repeat(50));
  console.log(
    `${colors.blue}Throughput:${colors.reset}           ${metrics.requestsPerSecond.toFixed(2)} req/s`,
  );
  console.log("─".repeat(50));
}

async function main(): Promise<void> {
  console.log("Performance Tests for Octopus Hackathon API");
  console.log(`API URL: ${API_URL}`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);

  // Test individual endpoints
  await testAllEndpoints();

  // Test concurrent requests
  const metrics = await testConcurrentRequests();
  printMetrics(metrics);

  // Test rate limiting
  await testRateLimiting();

  console.log(
    `\n${colors.green}✓ Performance tests completed!${colors.reset}\n`,
  );
}

main().catch((err) => {
  console.error("Performance test runner failed:", err);
  process.exit(1);
});
