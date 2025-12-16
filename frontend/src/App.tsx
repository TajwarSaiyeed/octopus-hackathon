import { useState, useEffect } from "react";
import "./App.css";

interface HealthResponse {
  status: "healthy" | "unhealthy";
  checks: {
    storage: "ok" | "error";
  };
}

interface DownloadStartResponse {
  file_id: number;
  status: "completed" | "failed";
  downloadUrl: string | null;
  size: number | null;
  processingTimeMs: number;
  message: string;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [fileId, setFileId] = useState<string>("10000");
  const [downloadStatus, setDownloadStatus] =
    useState<DownloadStartResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "/v1";

  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error(err);
      setHealth({ status: "unhealthy", checks: { storage: "error" } });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadStatus(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/download/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: parseInt(fileId) }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Download failed");
      }
      setDownloadStatus(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🐙 Octopus Hackathon Dashboard</h1>
        <div
          className={`status-badge ${health?.status === "healthy" ? "healthy" : "unhealthy"}`}
        >
          System:{" "}
          {loadingHealth
            ? "Checking..."
            : health?.status?.toUpperCase() || "UNKNOWN"}
        </div>
      </header>

      <main className="grid">
        <div className="card">
          <h2>System Status</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">API Status</span>
              <span
                className={`value ${health?.status === "healthy" ? "ok" : "error"}`}
              >
                {health?.status || "Unknown"}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Storage (MinIO)</span>
              <span
                className={`value ${health?.checks?.storage === "ok" ? "ok" : "error"}`}
              >
                {health?.checks?.storage || "Unknown"}
              </span>
            </div>
          </div>
          <button
            onClick={checkHealth}
            disabled={loadingHealth}
            className="refresh-btn"
          >
            Refresh Status
          </button>
        </div>

        <div className="card">
          <h2>Download Simulator</h2>
          <p>Test the long-running download process.</p>

          <div className="input-group">
            <label htmlFor="fileId">File ID (10000 - 100000000)</label>
            <input
              id="fileId"
              type="number"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              min="10000"
              max="100000000"
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="action-btn"
          >
            {downloading ? "Processing Download..." : "Start Download"}
          </button>

          {error && <div className="error-message">{error}</div>}

          {downloadStatus && (
            <div className={`result-box ${downloadStatus.status}`}>
              <h3>
                Download{" "}
                {downloadStatus.status === "completed" ? "Ready" : "Failed"}
              </h3>
              <p>{downloadStatus.message}</p>
              <p>
                Time: {(downloadStatus.processingTimeMs / 1000).toFixed(2)}s
              </p>
              {downloadStatus.downloadUrl && (
                <a
                  href={downloadStatus.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="download-link"
                >
                  Download File (
                  {((downloadStatus.size || 0) / 1024).toFixed(1)} KB)
                </a>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Observability Links</h2>
          <div className="links-list">
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="link-card"
            >
              <span className="icon">📊</span>
              <div className="link-info">
                <h3>Grafana</h3>
                <p>Dashboards & Metrics</p>
              </div>
            </a>
            <a
              href="http://localhost:9090"
              target="_blank"
              rel="noreferrer"
              className="link-card"
            >
              <span className="icon">📈</span>
              <div className="link-info">
                <h3>Prometheus</h3>
                <p>Raw Metrics Query</p>
              </div>
            </a>
            <a
              href="http://localhost:5601"
              target="_blank"
              rel="noreferrer"
              className="link-card"
            >
              <span className="icon">🔍</span>
              <div className="link-info">
                <h3>Kibana</h3>
                <p>Log Analysis</p>
              </div>
            </a>
            <a
              href="http://localhost:9001"
              target="_blank"
              rel="noreferrer"
              className="link-card"
            >
              <span className="icon">🗄️</span>
              <div className="link-info">
                <h3>MinIO Console</h3>
                <p>Object Storage</p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
