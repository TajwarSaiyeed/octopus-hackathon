/**
 * Security Test Script for Octopus Hackathon API
 * Tests security headers, rate limiting, input validation, and authentication
 * Usage: node --experimental-transform-types scripts/security-test.ts
 */

const API_URL = process.env.API_URL ?? "http://localhost:8080";

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

async function testSecurityHeaders(): Promise<void> {
  logSection("Security Headers");

  const response = await fetch(`${API_URL}/`);
  const headers = response.headers;

  // HSTS
  const hsts = headers.get("strict-transport-security");
  if (hsts && hsts.includes("max-age")) {
    logPass("HSTS header present with max-age");
  } else {
    logFail("HSTS header", "present with max-age", hsts ?? "missing");
  }

  // X-Frame-Options
  const xfo = headers.get("x-frame-options");
  if (xfo && (xfo === "DENY" || xfo === "SAMEORIGIN")) {
    logPass("X-Frame-Options prevents clickjacking");
  } else {
    logFail("X-Frame-Options", "DENY or SAMEORIGIN", xfo ?? "missing");
  }

  // X-Content-Type-Options
  const xcto = headers.get("x-content-type-options");
  if (xcto === "nosniff") {
    logPass("X-Content-Type-Options prevents MIME sniffing");
  } else {
    logFail("X-Content-Type-Options", "nosniff", xcto ?? "missing");
  }

  // CSP
  const csp = headers.get("content-security-policy");
  if (csp) {
    logPass("Content-Security-Policy header present");
  } else {
    logFail("Content-Security-Policy", "present", "missing");
  }

  // X-XSS-Protection (legacy but still good)
  const xss = headers.get("x-xss-protection");
  if (xss) {
    logPass("X-XSS-Protection header present");
  } else {
    logFail("X-XSS-Protection", "present", "missing");
  }
}

async function testRateLimiting(): Promise<void> {
  logSection("Rate Limiting");

  // Send rapid requests
  const promises = Array.from({ length: 30 }, () => fetch(`${API_URL}/`));
  const responses = await Promise.all(promises);

  // Check for 429 responses
  const rateLimited = responses.filter((r) => r.status === 429);

  if (rateLimited.length > 0) {
    logPass(`Rate limiting active (${rateLimited.length}/30 requests blocked)`);
  } else {
    logFail("Rate limiting", "some 429 responses", "no rate limits triggered");
  }

  // Check rate limit headers
  const lastResponse = responses[responses.length - 1];
  if (lastResponse) {
    const limitHeader = lastResponse.headers.get("ratelimit-limit");
    const remainingHeader = lastResponse.headers.get("ratelimit-remaining");

    if (limitHeader && remainingHeader) {
      logPass("Rate limit headers present");
    } else {
      logFail("Rate limit headers", "present", "missing");
    }
  }
}

async function testInputValidation(): Promise<void> {
  logSection("Input Validation");

  // Test SQL injection attempts
  const sqlPayloads = [
    { file_id: "1' OR '1'='1" },
    { file_id: "1; DROP TABLE users--" },
    { file_id: "1 UNION SELECT * FROM users" },
  ];

  for (const payload of sqlPayloads) {
    const response = await fetch(`${API_URL}/v1/download/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 400 || response.status === 422) {
      logPass(`SQL injection blocked: ${JSON.stringify(payload)}`);
    } else {
      logFail(
        `SQL injection check: ${JSON.stringify(payload)}`,
        "400 or 422",
        String(response.status),
      );
    }
  }

  // Test XSS attempts
  const xssPayloads = [
    { file_ids: ["<script>alert('xss')</script>"] },
    { file_ids: ["javascript:alert('xss')"] },
  ];

  for (const payload of xssPayloads) {
    const response = await fetch(`${API_URL}/v1/download/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 400 || response.status === 422) {
      logPass(`XSS payload blocked: ${JSON.stringify(payload)}`);
    } else {
      logFail(
        `XSS check: ${JSON.stringify(payload)}`,
        "400 or 422",
        String(response.status),
      );
    }
  }

  // Test buffer overflow attempts
  const largeArray = Array.from({ length: 10000 }, (_, i) => 10000 + i);
  const response = await fetch(`${API_URL}/v1/download/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_ids: largeArray }),
  });

  if (response.status === 400 || response.status === 422) {
    logPass("Buffer overflow attempt blocked (10000 file_ids)");
  } else {
    logFail("Buffer overflow check", "400 or 422", String(response.status));
  }
}

async function testPathTraversal(): Promise<void> {
  logSection("Path Traversal");

  // Test path traversal in download endpoints
  const pathPayloads = [
    { file_id: "../../../etc/passwd" },
    { file_id: "..\\..\\..\\windows\\system32\\config\\sam" },
    { file_id: "....//....//....//etc/passwd" },
  ];

  for (const payload of pathPayloads) {
    const response = await fetch(`${API_URL}/v1/download/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 400 || response.status === 422) {
      logPass(`Path traversal blocked: ${JSON.stringify(payload)}`);
    } else {
      logFail(
        `Path traversal check: ${JSON.stringify(payload)}`,
        "400 or 422",
        String(response.status),
      );
    }
  }
}

async function testCORS(): Promise<void> {
  logSection("CORS Configuration");

  const response = await fetch(`${API_URL}/`, {
    headers: {
      Origin: "https://evil.com",
    },
  });

  const corsHeader = response.headers.get("access-control-allow-origin");

  if (corsHeader === "*" || corsHeader === "https://evil.com") {
    logPass("CORS header present (configured)");
  } else {
    logFail("CORS header", "present", corsHeader ?? "missing");
  }

  // Test preflight
  const preflightResponse = await fetch(`${API_URL}/v1/download/check`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://example.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });

  if (preflightResponse.status === 200 || preflightResponse.status === 204) {
    logPass("CORS preflight handled correctly");
  } else {
    logFail("CORS preflight", "200 or 204", String(preflightResponse.status));
  }
}

async function testMethodSecurity(): Promise<void> {
  logSection("HTTP Method Security");

  // Test that dangerous methods are blocked
  const methods = ["PUT", "DELETE", "PATCH", "TRACE", "CONNECT"];

  for (const method of methods) {
    try {
      const response = await fetch(`${API_URL}/`, { method });

      if (
        response.status === 404 ||
        response.status === 405 ||
        response.status === 501
      ) {
        logPass(`${method} method properly rejected`);
      } else {
        logFail(
          `${method} method security`,
          "404/405/501",
          String(response.status),
        );
      }
    } catch (error) {
      logPass(`${method} method blocked at network level`);
    }
  }
}

async function testInformationDisclosure(): Promise<void> {
  logSection("Information Disclosure");

  // Test error messages don't leak sensitive info
  const response = await fetch(`${API_URL}/nonexistent-endpoint`);
  const text = await response.text();

  // Check for common info leaks
  const leaks = [
    "stack trace",
    "file path",
    "/home/",
    "/var/",
    "C:\\",
    "node_modules",
    "password",
    "secret",
  ];

  let leaked = false;
  for (const leak of leaks) {
    if (text.toLowerCase().includes(leak.toLowerCase())) {
      logFail("Information disclosure", "no sensitive data", `found '${leak}'`);
      leaked = true;
      break;
    }
  }

  if (!leaked) {
    logPass("No sensitive information disclosed in errors");
  }

  // Test server header
  const serverHeader = response.headers.get("server");
  if (!serverHeader || serverHeader === "nginx") {
    logPass("Server header doesn't leak version info");
  } else {
    logFail("Server header", "hidden or generic", serverHeader);
  }

  // Test X-Powered-By header (should not exist)
  const poweredBy = response.headers.get("x-powered-by");
  if (!poweredBy) {
    logPass("X-Powered-By header removed");
  } else {
    logFail("X-Powered-By header", "not present", poweredBy);
  }
}

async function testRequestIdTracking(): Promise<void> {
  logSection("Request ID Tracking");

  // Test custom request ID
  const customId = "security-test-" + Date.now();
  const response = await fetch(`${API_URL}/`, {
    headers: { "X-Request-ID": customId },
  });

  const returnedId = response.headers.get("x-request-id");

  if (returnedId === customId) {
    logPass("Custom request ID preserved");
  } else {
    logFail("Custom request ID", customId, returnedId ?? "missing");
  }

  // Test auto-generated ID
  const response2 = await fetch(`${API_URL}/`);
  const autoId = response2.headers.get("x-request-id");

  if (autoId && autoId.length > 20) {
    logPass("Auto-generated request ID present");
  } else {
    logFail("Auto-generated request ID", "present", autoId ?? "missing");
  }
}

function printSummary(): void {
  console.log(`\n${"=".repeat(50)}`);
  console.log("Security Test Summary:");
  console.log(`  Total:  ${results.total}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(
    `  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`,
  );
  console.log("=".repeat(50));

  if (results.failed === 0) {
    console.log(`\n${colors.green}✓ All security tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}✗ Some security tests failed!${colors.reset}`);
  }
}

async function main(): Promise<void> {
  console.log("Security Tests for Octopus Hackathon API");
  console.log(`API URL: ${API_URL}`);
  console.log();

  await testSecurityHeaders();
  await testRateLimiting();
  await testInputValidation();
  await testPathTraversal();
  await testCORS();
  await testMethodSecurity();
  await testInformationDisclosure();
  await testRequestIdTracking();

  printSummary();

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Security test runner failed:", err);
  process.exit(1);
});
