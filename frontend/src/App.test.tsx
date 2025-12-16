import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import App from "./App";

// Mock fetch
global.fetch = vi.fn();

describe("App Dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock to avoid errors on mount
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "healthy", checks: { storage: "ok" } }),
    });
  });

  it("renders the dashboard header", async () => {
    render(<App />);
    expect(
      screen.getByText("🐙 Octopus Hackathon Dashboard")
    ).toBeInTheDocument();
    // Wait for the initial fetch to settle to avoid act warnings
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it("fetches and displays health status", async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => ({ status: "healthy", checks: { storage: "ok" } }),
    });

    render(<App />);

    // Initial state
    expect(screen.getByText(/System:/)).toBeInTheDocument();

    // Wait for health check
    await waitFor(() => {
      expect(screen.getByText("API Status")).toBeInTheDocument();
    });
  });

  it("handles download simulation", async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => ({ status: "healthy", checks: { storage: "ok" } }),
    });

    render(<App />);

    const input = screen.getByLabelText(/File ID/);
    fireEvent.change(input, { target: { value: "12345" } });

    const button = screen.getByText("Start Download");

    // Mock download response
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        file_id: 12345,
        status: "completed",
        downloadUrl: "http://example.com/file.zip",
        size: 1024,
        processingTimeMs: 500,
        message: "Download ready",
      }),
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Download Ready")).toBeInTheDocument();
    });
  });
});
