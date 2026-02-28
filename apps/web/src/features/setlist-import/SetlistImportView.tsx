"use client";

import { useState } from "react";
import { FlowStepIndicator } from "@/components/FlowStepIndicator";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingButton } from "@/components/LoadingButton";
import { SectionTitle } from "@/components/SectionTitle";
import { StatusText } from "@/components/StatusText";
import { ConnectAppleMusic } from "@/features/matching/ConnectAppleMusic";
import { MatchingView } from "@/features/matching/MatchingView";
import type { MatchRow } from "@/features/matching/types";
import { CreatePlaylistView } from "@/features/playlist-export/CreatePlaylistView";
import { SetlistPreview } from "./SetlistPreview";
import { useSetlistImportState } from "./useSetlistImportState";

function ConnectAppleMusicInline() {
  return <ConnectAppleMusic label="Connect Apple Music" />;
}

type Step = "import" | "preview" | "matching" | "export";

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
  const [step, setStep] = useState<Step>("import");
  const [matchRows, setMatchRows] = useState<MatchRow[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await loadSetlist(inputValue);
    if (ok) setStep("preview");
  }

  if (step === "matching" && setlist) {
    return (
      <section className="step-section">
        <FlowStepIndicator step={3} total={4} label="Matching" />
        {inputValue.trim() && (
          <p className="muted-caption">
            Setlist: {inputValue.length > 50 ? `${inputValue.slice(0, 50)}…` : inputValue}
          </p>
        )}
        <button
          type="button"
          onClick={() => setStep("preview")}
          aria-label="Back to setlist preview"
          className="premium-button secondary"
        >
          ← Back to preview
        </button>
        <p className="muted-block" style={{ marginTop: "0.75rem" }}>
          Setlist: <strong>{setlist.artist}</strong>
          {setlist.venue ? ` at ${setlist.venue}` : ""} — {(setlist.sets ?? []).flat().length} tracks.
        </p>
        <ConnectAppleMusicInline />
        <MatchingView
          setlist={setlist}
          onProceedToCreatePlaylist={(matches) => {
            setMatchRows(matches);
            setStep("export");
          }}
        />
      </section>
    );
  }

  if (step === "export" && setlist && matchRows) {
    return (
      <section className="step-section">
        <FlowStepIndicator step={4} total={4} label="Export" />
        {inputValue.trim() && (
          <p className="muted-caption">
            Setlist: {inputValue.length > 50 ? `${inputValue.slice(0, 50)}…` : inputValue}
          </p>
        )}
        <button
          type="button"
          onClick={() => setStep("matching")}
          aria-label="Back to matching"
          className="premium-button secondary"
        >
          ← Back to matching
        </button>
        <CreatePlaylistView setlist={setlist} matchRows={matchRows} />
      </section>
    );
  }

  return (
    <section aria-label="Import setlist" className="glass-panel import-panel">
      <FlowStepIndicator step={step === "preview" ? 2 : 1} total={4} label={step === "preview" ? "Preview" : "Import"} />
      <SectionTitle>Import</SectionTitle>
      <p className="muted-block">
        Enter a setlist.fm URL or setlist ID (e.g.{" "}
        <code className="accent-inline">63de4613</code>).
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
            placeholder="https://www.setlist.fm/... or 63de4613"
            disabled={loading}
            aria-invalid={!!error}
            aria-describedby={error ? "setlist-error" : undefined}
          />
        </div>
        <LoadingButton
          type="submit"
          loading={loading}
          loadingChildren="Loading…"
          disabled={!inputValue.trim()}
          style={{ height: "46px" }}
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
        <StatusText style={{ color: "var(--accent-primary)", fontWeight: 500, marginTop: "0.5rem" }}>
          Loading setlist…
        </StatusText>
      )}

      {error && (
        <div id="setlist-error">
          <ErrorAlert message={error} onRetry={retryLast} retryLabel="Retry load setlist" />
        </div>
      )}

      {setlist && step === "preview" && (
        <>
          <FlowStepIndicator step={2} total={4} label="Preview" />
          {inputValue.trim() && <p className="muted-caption">Setlist: {inputValue}</p>}
          <SetlistPreview setlist={setlist} />
          <button
            type="button"
            className="premium-button"
            onClick={() => setStep("matching")}
            style={{ marginTop: "1.5rem" }}
          >
            Continue to Matching →
          </button>
        </>
      )}
    </section>
  );
}
