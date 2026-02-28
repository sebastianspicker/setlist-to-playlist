"use client";

import { getErrorMessage } from "@repo/shared";
import { Button } from "@repo/ui";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingButton } from "@/components/LoadingButton";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { authorizeMusicKit, initMusicKit } from "@/lib/musickit";

export interface ConnectAppleMusicProps {
  onAuthorized?: () => void;
  label?: string;
}

function friendlyAuthMessage(message: string): string {
  if (message.includes("cancel") || message.includes("denied")) {
    return "You cancelled or denied access. Click below to try again.";
  }
  if (message.includes("revoked") || message.includes("unauthorized")) {
    return "Apple Music access was revoked. Click below to connect again.";
  }
  return message;
}

/**
 * "Connect Apple Music" flow: init MusicKit, authorize user, show errors and retry.
 */
export function ConnectAppleMusic({
  onAuthorized,
  label = "Connect Apple Music",
}: ConnectAppleMusicProps) {
  const { loading, error, run } = useAsyncAction();

  function handleAuthorize() {
    run(async () => {
      try {
        await authorizeMusicKit();
        onAuthorized?.();
      } catch (err) {
        const message = getErrorMessage(err, "Authorization failed");
        throw new Error(friendlyAuthMessage(message));
      }
    });
  }

  function handleDisconnect() {
    run(async () => {
      try {
        const music = await initMusicKit();
        await music.unauthorize();
        onAuthorized?.();
      } catch (err) {
        throw new Error(getErrorMessage(err, "Failed to disconnect"));
      }
    });
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <LoadingButton
        onClick={handleAuthorize}
        loading={loading}
        loadingChildren="Connecting…"
        aria-label={loading ? "Connecting to Apple Music" : label}
        title="Sign in with Apple Music to create playlists in your library"
      >
        {label}
      </LoadingButton>

      <Button
        onClick={handleDisconnect}
        disabled={loading}
        variant="secondary"
        aria-label="Disconnect Apple Music"
        style={{ marginLeft: "0.5rem", cursor: loading ? "not-allowed" : "pointer" }}
      >
        Disconnect
      </Button>

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
