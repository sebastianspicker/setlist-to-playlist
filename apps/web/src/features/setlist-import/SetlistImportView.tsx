'use client';

import dynamic from 'next/dynamic';
import { FlowStepIndicator } from '@/components/FlowStepIndicator';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingButton } from '@/components/LoadingButton';
import { SectionTitle } from '@/components/SectionTitle';
import { StatusText } from '@/components/StatusText';
import { ConnectAppleMusic } from '@/features/matching/ConnectAppleMusic';
import { SetlistPreview } from './SetlistPreview';
import { useFlowState } from './useFlowState';
import { useSetlistImportState } from './useSetlistImportState';

const MatchingView = dynamic(
  () =>
    import('@/features/matching/MatchingView').then((m) => ({
      default: m.MatchingView,
    })),
  { loading: () => <StatusText>Loading matching…</StatusText> }
);

const CreatePlaylistView = dynamic(
  () =>
    import('@/features/playlist-export/CreatePlaylistView').then((m) => ({
      default: m.CreatePlaylistView,
    })),
  { loading: () => <StatusText>Loading export…</StatusText> }
);

export function SetlistImportView() {
  const {
    inputValue,
    setInputValue,
    setlist,
    loading,
    error,
    history,
    loadSetlist,
    retryLast,
    selectHistoryItem,
    clearHistory,
  } = useSetlistImportState();
  const {
    step,
    matchRows,
    stepContainerRef,
    goToPreview,
    goToMatching,
    goToExport,
    goBackToPreview,
    goBackToMatching,
  } = useFlowState();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await loadSetlist(inputValue);
    if (ok) goToPreview();
  }

  if (step === 'matching' && setlist) {
    return (
      <section ref={stepContainerRef} className="step-section" aria-label="Matching step">
        <FlowStepIndicator step={3} total={4} label="Match songs" />
        <button
          type="button"
          onClick={goBackToPreview}
          aria-label="Back to setlist preview"
          className="premium-button secondary back-button"
        >
          Back to preview
        </button>
        <p className="muted-block" style={{ marginTop: '0.75rem' }}>
          <strong>{setlist.artist}</strong>
          {setlist.venue ? ` at ${setlist.venue}` : ''}
        </p>
        <ConnectAppleMusic />
        <MatchingView
          setlist={setlist}
          onProceedToCreatePlaylist={(matches) => {
            goToExport(matches);
          }}
        />
      </section>
    );
  }

  if (step === 'export' && setlist && matchRows) {
    return (
      <section ref={stepContainerRef} className="step-section" aria-label="Export step">
        <FlowStepIndicator step={4} total={4} label="Save playlist" />
        <button
          type="button"
          onClick={goBackToMatching}
          aria-label="Back to matching"
          className="premium-button secondary back-button"
        >
          Back to matching
        </button>
        <CreatePlaylistView setlist={setlist} matchRows={matchRows} />
      </section>
    );
  }

  return (
    <section
      ref={stepContainerRef}
      aria-label="Import setlist"
      className="glass-panel import-panel"
    >
      <FlowStepIndicator
        step={step === 'preview' ? 2 : 1}
        total={4}
        label={step === 'preview' ? 'Preview setlist' : 'Find setlist'}
      />
      <SectionTitle>Find your setlist</SectionTitle>
      <p className="muted-block">
        Paste a link from{' '}
        <a
          href="https://www.setlist.fm"
          target="_blank"
          rel="noopener noreferrer"
          className="accent-link"
        >
          setlist.fm
        </a>{' '}
        or enter a setlist ID to get started.
      </p>

      <form onSubmit={handleSubmit} className="import-form">
        <div className="import-input-wrap">
          <label htmlFor="setlist-input" className="input-label">
            Setlist URL or ID
          </label>
          <input
            id="setlist-input"
            type="text"
            className="premium-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="https://www.setlist.fm/setlist/..."
            disabled={loading}
            aria-invalid={!!error}
            aria-describedby={error ? 'setlist-error' : 'setlist-hint'}
          />
          {!error && (
            <p id="setlist-hint" className="input-hint">
              Example: <code className="accent-inline">https://www.setlist.fm/setlist/radiohead/...63de4613.html</code> or just <code className="accent-inline">63de4613</code>
            </p>
          )}
        </div>
        <LoadingButton
          type="submit"
          loading={loading}
          loadingChildren="Fetching setlist…"
          disabled={!inputValue.trim()}
          style={{ height: '46px' }}
          title="Fetch setlist from setlist.fm"
        >
          Load setlist
        </LoadingButton>
      </form>

      {history.length > 0 && (
        <div className="history-panel">
          <div className="history-header">
            <strong>Recent imports</strong>
            <button type="button" className="premium-button secondary mini" onClick={clearHistory}>
              Clear
            </button>
          </div>
          <ul className="history-list">
            {history.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="history-item-button"
                  onClick={() => selectHistoryItem(item)}
                  title={item}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <StatusText
          style={{ color: 'var(--accent-primary)', fontWeight: 500, marginTop: '0.5rem' }}
        >
          Loading setlist…
        </StatusText>
      )}

      {error && (
        <div id="setlist-error">
          <ErrorAlert message={error} onRetry={retryLast} retryLabel="Retry load setlist" />
        </div>
      )}

      {setlist && step === 'preview' && (
        <>
          <SetlistPreview setlist={setlist} />
          <p className="muted-block" style={{ marginTop: '1rem' }}>
            Looks good? Continue to match these songs on Apple Music.
          </p>
          <button
            type="button"
            className="premium-button"
            onClick={goToMatching}
            style={{ marginTop: '0.5rem' }}
          >
            Find songs on Apple Music
          </button>
        </>
      )}
    </section>
  );
}
