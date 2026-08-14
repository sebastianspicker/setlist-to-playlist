'use client';

import type { FormEvent, RefObject } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StatusText } from '@/components/StatusText';
import { WorkflowStepHeader } from '@/components/WorkflowStepHeader';
import { ImportForm } from './ImportForm';
import { ImportHistoryList } from './ImportHistoryList';
import type { ImportHistoryItem } from './importHistory';

export interface ImportStepProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  loading: boolean;
  displayedError: string | null;
  retryable: boolean;
  history: ImportHistoryItem[];
  historyAnnouncement: string;
  inputRef: RefObject<HTMLInputElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  onSubmit: (event: FormEvent) => void;
  onValidateInput: () => boolean;
  onCancelLoad: () => void;
  onRetry: () => void;
  onSelectHistoryItem: (item: ImportHistoryItem) => void;
  onClearHistory: () => void;
}

type ImportStatusProps = Pick<
  ImportStepProps,
  'loading' | 'displayedError' | 'retryable' | 'onRetry'
>;

function ImportStatus({ loading, displayedError, retryable, onRetry }: ImportStatusProps) {
  return (
    <>
      {loading ? <StatusText>Loading setlist…</StatusText> : null}
      {displayedError ? (
        <div id="setlist-error">
          <ErrorAlert
            message={displayedError}
            onRetry={retryable ? onRetry : undefined}
            retryLabel="Retry load setlist"
          />
        </div>
      ) : null}
    </>
  );
}

export function ImportStep(props: ImportStepProps) {
  return (
    <section className="workflow-section import-section" aria-label="Import setlist">
      <WorkflowStepHeader
        step={1}
        title="Import a setlist"
        stageLabel="Step 1 of 4 · Start with a show"
        context="Paste a setlist.fm link or enter its setlist ID."
        headingRef={props.headingRef}
      />

      <div className="workflow-orientation-panel" aria-labelledby="workflow-orientation-title">
        <h3 id="workflow-orientation-title">How it works</h3>
        <ol className="workflow-orientation">
          <li>Import the concert setlist.</li>
          <li>Confirm the show and song order.</li>
          <li>Review the Apple Music matches.</li>
          <li>Create the playlist in your library.</li>
        </ol>
      </div>

      <ImportForm
        inputValue={props.inputValue}
        setInputValue={props.setInputValue}
        loading={props.loading}
        displayedError={props.displayedError}
        inputRef={props.inputRef}
        onSubmit={props.onSubmit}
        onValidateInput={props.onValidateInput}
        onCancelLoad={props.onCancelLoad}
      />

      <ImportStatus
        loading={props.loading}
        displayedError={props.displayedError}
        retryable={props.retryable}
        onRetry={props.onRetry}
      />

      <ImportHistoryList
        history={props.history}
        onSelectHistoryItem={props.onSelectHistoryItem}
        onClearHistory={props.onClearHistory}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {props.historyAnnouncement}
      </span>
    </section>
  );
}
