'use client';

import type { Setlist } from '@repo/core';
import { Button } from '@repo/ui';
import { getSafeAppleUrl } from './appleUrl';

interface CreatedPlaylist {
  id: string;
  url?: string;
}

interface SuccessExportStateProps {
  setlist: Setlist;
  created: CreatedPlaylist;
  songIds: string[];
  onStartAnother?: VoidFunction;
}

export function SuccessExportState({
  setlist,
  created,
  songIds,
  onStartAnother,
}: SuccessExportStateProps) {
  const safeAppleUrl = getSafeAppleUrl(created.url);

  return (
    <section
      className="terminal-state terminal-state--success export-terminal"
      aria-labelledby="success-title"
    >
      <h3 id="success-title">Playlist ready</h3>
      <p>
        {setlist.artist}
        {setlist.venue ? ` at ${setlist.venue}` : ''} · {songIds.length} song
        {songIds.length === 1 ? '' : 's'} added
      </p>
      <div className="step-actions">
        {safeAppleUrl ? (
          <a
            href={safeAppleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button--primary"
          >
            Open in Apple Music
          </a>
        ) : (
          <p className="support-text">Open Apple Music to find the new playlist.</p>
        )}
        {onStartAnother ? (
          <Button variant="secondary" onClick={onStartAnother}>
            Start another setlist
          </Button>
        ) : null}
      </div>
    </section>
  );
}
