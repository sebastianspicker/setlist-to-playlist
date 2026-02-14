"use client";

import { useState, useRef } from "react";
import { mapSetlistFmToSetlist } from "@repo/core";
import type { Setlist } from "@repo/core";
import type { SetlistFmResponse } from "@repo/core";
import { setlistProxyUrl } from "@/lib/api";
import { ConnectAppleMusic, MatchingView } from "@/features/matching";
import type { MatchRow } from "@/features/matching";
import { CreatePlaylistView } from "@/features/playlist-export";
import { SetlistPreview } from "./SetlistPreview";

function ConnectAppleMusicInline() {
  return <ConnectAppleMusic label="Connect Apple Music" />;
}

type Step = "import" | "preview" | "matching" | "export";

export function SetlistImportView() {
  const [inputValue, setInputValue] = useState("");
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("import");
  const [matchRows, setMatchRows] = useState<MatchRow[] | null>(null);

  /** DCI-042: Ignore stale responses; only update state for the latest request. */
  const currentRequestRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /** DCI-010: Avoid URL length limits; suggest using setlist ID for long URLs. */
  const MAX_INPUT_LENGTH = 2000;

  async function loadSetlist(trimmed: string) {
    setError(null);
    if (trimmed.length > MAX_INPUT_LENGTH) {
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
      setError(err instanceof Error ? err.message : String(err ?? "Network error"));
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
        <p style={{ color: "#444", marginBottom: "0.5rem" }}>
          Setlist: <strong>{setlist.artist}</strong>
          {setlist.venue && ` at ${setlist.venue}`} — {(setlist.sets ?? []).flat().length} tracks.
        </p>
        <p style={{ color: "#666", fontSize: "0.9em", marginBottom: "0.5rem" }}>
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
        <CreatePlaylistView setlist={setlist} matchRows={matchRows} />
      </section>
    );
  }

  return (
    <section aria-label="Import setlist">
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Import</h2>
      <p style={{ marginBottom: "1rem", color: "#444" }}>
        Enter a setlist.fm URL or setlist ID (e.g. <code>63de4613</code>).
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <label htmlFor="setlist-input" style={{ display: "block", marginBottom: "0.25rem" }}>
          Setlist URL or ID
        </label>
        <input
          id="setlist-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="https://www.setlist.fm/... or 63de4613"
          disabled={loading}
          aria-invalid={!!error}
          aria-describedby={error ? "setlist-error" : undefined}
          style={{
            width: "100%",
            maxWidth: "28rem",
            padding: "0.5rem 0.75rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          style={{
            marginLeft: "0.5rem",
            marginTop: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading…" : "Load setlist"}
        </button>
      </form>

      {loading && (
        <p role="status" aria-live="polite" style={{ color: "#666" }}>
          Loading setlist…
        </p>
      )}

      {error && (
        <div
          id="setlist-error"
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
          <p style={{ margin: 0 }}>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            style={{
              marginTop: "0.5rem",
              padding: "0.25rem 0.75rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {setlist && step === "preview" && (
        <>
          <SetlistPreview setlist={setlist} />
          <button
            type="button"
            onClick={goToMatching}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Continue to Matching →
          </button>
        </>
      )}
    </section>
  );
}
