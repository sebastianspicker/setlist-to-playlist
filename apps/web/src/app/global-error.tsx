"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <html lang="en">
      <body>
        <main style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
          <h1>Something went wrong</h1>
          <p style={{ color: "#666", marginTop: "0.5rem" }}>
            {message || "An unexpected error occurred. You can try again."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
