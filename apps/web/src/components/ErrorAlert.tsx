"use client";

export interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
  /** Accessible label for the retry button. Default: "Try again" */
  retryLabel?: string;
}

export function ErrorAlert({ message, onRetry, retryLabel = "Try again" }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      style={{
        marginTop: "0.75rem",
        padding: "0.75rem",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "4px",
        color: "#b91c1c",
      }}
    >
      <p style={{ margin: 0 }}>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        aria-label={retryLabel}
        style={{
          marginTop: "0.5rem",
          padding: "0.25rem 0.75rem",
          cursor: "pointer",
        }}
      >
        {retryLabel}
      </button>
    </div>
  );
}
