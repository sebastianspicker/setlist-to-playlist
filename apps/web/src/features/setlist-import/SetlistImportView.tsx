"use client";

import { useState, useRef } from "react";
import { mapSetlistFmToSetlist } from "@repo/core";
import type { Setlist } from "@repo/core";
import type { SetlistFmResponse } from "@repo/core";
import { getErrorMessage, MAX_SETLIST_INPUT_LENGTH } from "@repo/shared";
import { setlistProxyUrl } from "@/lib/api";
import { ErrorAlert } from "@/components/ErrorAlert";
import { SectionTitle } from "@/components/SectionTitle";
import { ConnectAppleMusic } from "@/features/matching/ConnectAppleMusic";
import { MatchingView } from "@/features/matching/MatchingView";
import type { MatchRow } from "@/features/matching/MatchingView";
import { CreatePlaylistView } from "@/features/playlist-export/CreatePlaylistView";
import { SetlistPreview } from "./SetlistPreview";

function ConnectAppleMusicInline() {
  return <ConnectAppleMusic label="Connect Apple Music" />;
}

type Step = "import" | "preview" | "matching" | "export";

/**
 * Main View Component for importing a Setlist from setlist.fm.
 * It manages the user input, loading states, error boundaries, 
 * and sequence orchestration leading into the track matching phase.
 */
export function SetlistImportView() {
  const [inputValue, setInputValue] = useState("");
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("import");
  const [matchRows, setMatchRows] = useState<MatchRow[] | null>(null);

  // References to handle race conditions during rapid consecutive network requests.
  // The AbortController actively cancels in-flight duplicate requests if a user types too quickly.
  const currentRequestRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function loadSetlist(trimmed: string) {
    setError(null);
    if (trimmed.length > MAX_SETLIST_INPUT_LENGTH) {
      setError(
        "Input is too long. Please paste the setlist ID only (e.g. 63de4613) or a shorter URL from setlist.fm."
      );
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    currentRequestRef.current = trimmed;
    setLoading(true);
    try {
      const url = setlistProxyUrl(`id=${encodeURIComponent(trimmed)}`);
      const res = await fetch(url, { signal });
      let data: { error?: string } | SetlistFmResponse;
      try {
        data = (await res.json()) as { error?: string } | SetlistFmResponse;
      } catch {
        if (currentRequestRef.current !== trimmed) return;
        setError("The server returned an invalid response. Please try again or check the URL.");
        setSetlist(null);
        return;
      }

      if (currentRequestRef.current !== trimmed) return;

      if (!res.ok || "error" in data) {
        const message =
          (data as { error?: string }).error ?? `Request failed (${res.status})`;
        setError(message);
        setSetlist(null);
        return;
      }

      const mapped = mapSetlistFmToSetlist(data as SetlistFmResponse);
      setSetlist(mapped);
      setStep("preview");
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      if (currentRequestRef.current !== trimmed) return;
      setError(getErrorMessage(err, "Network error"));
      setSetlist(null);
    } finally {
      if (currentRequestRef.current === trimmed) {
        setLoading(false);
        currentRequestRef.current = null;
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) loadSetlist(trimmed);
  }

  function handleRetry() {
    const trimmed = inputValue.trim();
    if (trimmed) loadSetlist(trimmed);
  }

  function goToMatching() {
    setStep("matching");
  }

  if (step === "matching" && setlist) {
    return (
      <section style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setStep("preview")}
          aria-label="Back to setlist preview"
          className="premium-button secondary"
          style={{ marginBottom: "1rem", padding: "0.35rem 0.75rem", fontSize: "0.9rem" }}
        >
          ← Back to preview
        </button>
        <p style={{ color: "var(--text-main)", marginBottom: "0.5rem" }}>
          Setlist: <strong>{setlist.artist}</strong>
          {setlist.venue && ` at ${setlist.venue}`} — {(setlist.sets ?? []).flat().length} tracks.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9em", marginBottom: "0.5rem" }}>
          Connect Apple Music to search for tracks (required for suggestions).
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
      <section style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setStep("matching")}
          aria-label="Back to matching"
          className="premium-button secondary"
          style={{ marginBottom: "1rem", padding: "0.35rem 0.75rem", fontSize: "0.9rem" }}
        >
          ← Back to matching
        </button>
        <CreatePlaylistView setlist={setlist} matchRows={matchRows} />
      </section>
    );
  }

  return (
    <section aria-label="Import setlist" className="glass-panel" style={{ marginTop: "2rem" }}>
      <SectionTitle>Import</SectionTitle>
      <p style={{ marginBottom: "1.5rem", color: "var(--text-muted)" }}>
        Enter a setlist.fm URL or setlist ID (e.g. <code style={{ color: "var(--accent-primary)" }}>63de4613</code>).
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 auto", minWidth: "200px", maxWidth: "28rem" }}>
          <label htmlFor="setlist-input" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "var(--text-main)" }}>
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
        <button
          type="submit"
          className="premium-button"
          disabled={loading || !inputValue.trim()}
          style={{ height: "46px" }}
        >
          {loading ? "Loading…" : "Load setlist"}
        </button>
      </form>

      {loading && (
        <p role="status" aria-live="polite" style={{ color: "var(--accent-primary)", fontWeight: 500 }}>
          Loading setlist…
        </p>
      )}

      {error && (
        <div id="setlist-error">
          <ErrorAlert message={error} onRetry={handleRetry} retryLabel="Retry load setlist" />
        </div>
      )}

      {setlist && step === "preview" && (
        <>
          <SetlistPreview setlist={setlist} />
          <button
            type="button"
            className="premium-button"
            onClick={goToMatching}
            style={{ marginTop: "1.5rem" }}
          >
            Continue to Matching →
          </button>
        </>
      )}
    </section>
  );
}
