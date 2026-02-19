"use client";

export interface ErrorBoundaryViewProps {
  message: string;
  onReset: () => void;
  /** Accessible label for the reset button. Default: "Try again" */
  resetLabel?: string;
}

export function ErrorBoundaryView({
  message,
  onReset,
  resetLabel = "Try again",
}: ErrorBoundaryViewProps) {
  return (
    <main id="main" style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto" }}>
      <h1>Something went wrong</h1>
      <p style={{ color: "#666", marginTop: "0.5rem" }}>
        {message || "An error occurred. You can try again."}
      </p>
      <button
        type="button"
        onClick={onReset}
        aria-label={resetLabel}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          cursor: "pointer",
        }}
      >
        {resetLabel}
      </button>
    </main>
  );
}
