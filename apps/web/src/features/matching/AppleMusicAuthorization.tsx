'use client';

import { useState } from 'react';
import { getErrorMessage } from '@repo/shared';
import { Button } from '@repo/ui';
import { ErrorAlert } from '@/components/ErrorAlert';
import { authorizeMusicKit, isMusicKitAuthorized } from '@/lib/musickit';

export interface AppleMusicAuthorizationProps {
  onAuthorized?: () => void;
  label?: string;
}

function friendlyAuthMessage(message: string): string {
  if (message.includes('cancel') || message.includes('denied')) {
    return 'You cancelled or denied access. Click below to try again.';
  }
  if (message.includes('revoked') || message.includes('unauthorized')) {
    return 'Apple Music access was revoked. Click below to connect again.';
  }
  return message;
}

export function AppleMusicAuthorization({
  onAuthorized,
  label = 'Connect Apple Music',
}: AppleMusicAuthorizationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setLoading(false);
    }
  };
  const handleAuthorize = () => {
    void runAction(async () => {
      try {
        await authorizeMusicKit();
        if (!(await isMusicKitAuthorized())) {
          throw new Error('Apple Music authorization was not confirmed. Click below to try again.');
        }
        onAuthorized?.();
      } catch (authorizationError) {
        throw new Error(
          friendlyAuthMessage(getErrorMessage(authorizationError, 'Authorization failed.'))
        );
      }
    });
  };
  return (
    <div className="connect-apple-music">
      <Button
        onClick={handleAuthorize}
        loading={loading}
        loadingChildren="Connecting…"
        aria-label={loading ? 'Connecting to Apple Music' : label}
        title="Sign in with Apple Music to create playlists in your library"
        className="proceed-button"
      >
        {label}
      </Button>
      {error && (
        <ErrorAlert message={error} onRetry={handleAuthorize} retryLabel="Try connecting again" />
      )}
    </div>
  );
}
