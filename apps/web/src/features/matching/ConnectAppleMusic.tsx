"use client";

import { useState } from "react";
import { getErrorMessage } from "@repo/shared";
import { ErrorAlert } from "@/components/ErrorAlert";
import { authorizeMusicKit, initMusicKit } from "@/lib/musickit";

export interface ConnectAppleMusicProps {
  onAuthorized?: () => void;
  label?: string;
}

/**
 * "Connect Apple Music" flow: init MusicKit, authorize user, show errors and retry.
 */
export function ConnectAppleMusic({
  onAuthorized,
  label = "Connect Apple Music",
}: ConnectAppleMusicProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAuthorize() {
    setError(null);
    setLoading(true);
    try {
      await initMusicKit();
      await authorizeMusicKit();
      onAuthorized?.();
    } catch (err) {
      const message = getErrorMessage(err, "Authorization failed");
      const friendly =
        message.includes("cancel") || message.includes("denied")
          ? "You cancelled or denied access. Click below to try again."
          : message.includes("revoked") || message.includes("unauthorized")
            ? "Apple Music access was revoked. Click below to connect again."
            : message;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <button
        type="button"
        onClick={handleAuthorize}
        disabled={loading}
        aria-busy={loading}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Connecting…" : label}
      </button>
      {error && (
        <ErrorAlert
          message={error}
          onRetry={handleAuthorize}
          retryLabel="Try connecting again"
        />
      )}
    </div>
  );
}
