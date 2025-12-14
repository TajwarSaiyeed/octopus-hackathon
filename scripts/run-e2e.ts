/**
 * Run E2E Tests with Server Management
 * Usage: node --experimental-transform-types scripts/run-e2e.ts
 */

import { spawn, type ChildProcess } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.dirname(__dirname);

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
};

let serverProcess: ChildProcess | null = null;

function cleanup(): void {
  console.log();
  console.log(`${colors.yellow}Cleaning up...${colors.reset}`);
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
  console.log("Done.");
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(1);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(1);
});

async function waitForServer(maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch("http://localhost:3000/health");
      // Accept any response (200 or 503) - server is running
      if (response.status === 200 || response.status === 503) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function startServer(): Promise<ChildProcess> {
  console.log(`${colors.yellow}Starting server...${colors.reset}`);

  // Check if .env file exists, use --env-file only if it does
  const envFileArg =
    process.env.CI !== "true" &&
    (await fileExists(path.join(projectDir, ".env")))
      ? ["--env-file=.env"]
      : [];

  const server = spawn(
    "node",
    [...envFileArg, "--experimental-transform-types", "src/index.ts"],
    {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    },
  );

  server.stdout?.on("data", (data: Buffer) => {
    const output = data.toString().trim();
    if (output) console.log(`[server] ${output}`);
  });

  server.stderr?.on("data", (data: Buffer) => {
    const output = data.toString().trim();
    // Filter out experimental warning
    if (output && !output.includes("ExperimentalWarning")) {
      console.error(`[server] ${output}`);
    }
  });

  return server;
}

async function runTests(): Promise<number> {
  console.log();
  console.log(`${colors.yellow}Running E2E tests...${colors.reset}`);
  console.log();

  return new Promise((resolve) => {
    const testProcess = spawn(
      "node",
      ["--experimental-transform-types", "scripts/e2e-test.ts"],
      {
        cwd: projectDir,
        stdio: "inherit",
      },
    );

    testProcess.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function main(): Promise<void> {
  try {
    // Start server
    serverProcess = await startServer();

    // Wait for server to be ready
    console.log(
      `Waiting for server to start (PID: ${String(serverProcess.pid)})...`,
    );
    const serverReady = await waitForServer();

    if (!serverReady) {
      console.error(
        `${colors.red}Server did not become ready in time.${colors.reset}`,
      );
      cleanup();
      process.exit(1);
    }

    console.log(`${colors.green}Server started successfully!${colors.reset}`);

    // Run tests
    const testExitCode = await runTests();

    // Cleanup and exit
    cleanup();
    process.exit(testExitCode);
  } catch (error) {
    console.error("Error running tests:", error);
    cleanup();
    process.exit(1);
  }
}

main();
