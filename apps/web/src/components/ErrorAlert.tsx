"use client";

/**
 * A reusable UI component that displays an inline error message along with a retry button.
 * Designed to be used within smaller sections of the UI that fail to load or process.
 */

function isLikelyNetworkError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed")
  );
}

export interface ErrorAlertProps {
  message: string;
  onRetry: () => void;
  /** Accessible label for the retry button. Default: "Try again" */
  retryLabel?: string;
}

export function ErrorAlert({ message, onRetry, retryLabel = "Try again" }: ErrorAlertProps) {
  const showOfflineHint = isLikelyNetworkError(message);
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
      {showOfflineHint && (
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.9em", opacity: 0.9 }}>
          Offline? Check your connection and try again.
        </p>
      )}
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
