'use client';

import { Button } from '@repo/ui';
import { ErrorAlert } from '@/components/ErrorAlert';
import { AppleMusicAuthorization } from '@/features/matching/AppleMusicAuthorization';

export interface ExportActionPanelProps {
  needsAuth: boolean;
  dedupeTracks: boolean;
  setDedupeTracks: (value: boolean) => void;
  dedupeSavings: number;
  count: number;
  loading: boolean;
  error: string | null;
  createOutcomeUnknown: boolean;
  onCreate: () => void;
  onAuthorized: () => void;
}

function MutationNote() {
  return (
    <div className="mutation-note">
      <span className="mutation-note__icon" aria-hidden="true">
        ↗
      </span>
      <div>
        <h3>Before you continue</h3>
        <p>
          This creates one playlist in your Apple Music library. If Apple Music cannot confirm the
          result, inspect your library before trying again.
        </p>
      </div>
    </div>
  );
}

export function ExportActionPanel(props: ExportActionPanelProps) {
  return (
    <section className="export-action-panel" aria-label="Apple Music playlist creation">
      <p className="export-service">Apple Music</p>
      <div className="connection-status">
        <span className="connection-status__label">Connection</span>
        <strong>{props.needsAuth ? 'Not connected' : 'Checked when you create'}</strong>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={props.dedupeTracks}
          onChange={(event) => {
            props.setDedupeTracks(event.target.checked);
          }}
        />
        <span>
          <strong>Remove duplicate songs</strong>
          <small>
            {props.dedupeTracks && props.dedupeSavings > 0
              ? `${props.dedupeSavings} duplicate song${props.dedupeSavings === 1 ? '' : 's'} will be removed.`
              : 'No duplicates found in the current selection.'}
          </small>
        </span>
      </label>

      <MutationNote />

      {props.needsAuth ? (
        <AppleMusicAuthorization
          onAuthorized={props.onAuthorized}
          label="Connect Apple Music and create playlist"
        />
      ) : props.createOutcomeUnknown ? null : (
        <Button
          onClick={props.onCreate}
          disabled={props.count === 0}
          loading={props.loading}
          loadingChildren="Creating playlist…"
          className="export-create"
        >
          Create playlist
        </Button>
      )}

      {props.error ? (
        <ErrorAlert
          message={props.error}
          onRetry={() => {
            props.onCreate();
          }}
          retryLabel={
            props.createOutcomeUnknown
              ? 'I checked my library — create again'
              : 'Retry create playlist'
          }
        />
      ) : null}
    </section>
  );
}
