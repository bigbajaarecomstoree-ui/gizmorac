"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort boundary for failures in the root layout itself. Renders its own
 * <html>/<body> (it replaces the root layout). Kept dependency-light on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            background: "#fafafa",
            color: "#1a1a1a",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              background: "#fff",
              padding: "2rem",
            }}
          >
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              GIZMORAC is temporarily unavailable
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
              We hit an unexpected error. Please try again in a moment.
            </p>
            {error.digest ? (
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8, fontFamily: "monospace" }}>
                Ref: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 24,
                background: "#f59e0b",
                color: "#1a1a1a",
                border: "none",
                borderRadius: 8,
                padding: "0.6rem 1.2rem",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
