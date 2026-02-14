"use client";

import { useState, useEffect } from "react";
import { buildSearchQuery } from "@repo/core";
import type { Setlist, SetlistEntry } from "@repo/core";
import type { AppleMusicTrack } from "@/lib/musickit";
import { searchCatalog } from "@/lib/musickit";

export interface MatchRow {
  setlistEntry: SetlistEntry;
  appleTrack: AppleMusicTrack | null;
}

/** DCI-045: Skip null/non-object entries so malformed set data does not produce invalid rows. */
function flattenSetlist(setlist: Setlist): SetlistEntry[] {
  const entries: SetlistEntry[] = [];
  const artist = setlist.artist;
  for (const set of setlist.sets ?? []) {
    if (!Array.isArray(set)) continue;
    for (const entry of set) {
      if (entry == null || typeof entry !== "object") continue;
      entries.push({ ...entry, artist: entry.artist ?? artist });
    }
  }
  return entries;
}

export interface MatchingViewProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
}

export function MatchingView({ setlist, onProceedToCreatePlaylist }: MatchingViewProps) {
  const entries = flattenSetlist(setlist);
  const [matches, setMatches] = useState<MatchRow[]>(() =>
    entries.map((setlistEntry) => ({ setlistEntry, appleTrack: null }))
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const entriesFlat = flattenSetlist(setlist);
    if (entriesFlat.length === 0) {
      setMatches([]);
      setLoadingSuggestions(false);
      return;
    }
    // DCI-013: Re-initialize matches when setlist structure changes so length and rows stay in sync.
    setMatches(entriesFlat.map((setlistEntry) => ({ setlistEntry, appleTrack: null })));
    let cancelled = false;
    (async () => {
      setLoadingSuggestions(true);
      for (let i = 0; i < entriesFlat.length; i++) {
        if (cancelled) return;
        const entry = entriesFlat[i];
        const query = buildSearchQuery(entry.name, entry.artist);
        if (!query) continue;
        try {
          const tracks = await searchCatalog(query, 1);
          if (cancelled) return;
          const track = tracks[0] ?? null;
          setMatches((prev) => {
            const next = [...prev];
            if (next[i]) next[i] = { ...next[i], appleTrack: track };
            return next;
          });
        } catch {
          if (cancelled) return;
          setMatches((prev) => {
            const next = [...prev];
            if (next[i]) next[i] = { ...next[i], appleTrack: null };
            return next;
          });
        }
      }
      if (!cancelled) setLoadingSuggestions(false);
    })();
    return () => {
      cancelled = true;
    };
    // DCI-009: Re-run when setlist id or set structure changes (e.g. refresh / replaced data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setlist.id, (setlist.sets ?? []).map((s) => s.length).join(",")]);

  function setMatch(index: number, appleTrack: AppleMusicTrack | null) {
    setMatches((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = { ...next[index], appleTrack };
      return next;
    });
    setSearchingIndex(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function runSearch(index: number) {
    const row = matches[index];
    if (index < 0 || index >= matches.length || !row?.setlistEntry) return;
    const q = searchQuery.trim() || buildSearchQuery(row.setlistEntry.name, row.setlistEntry.artist);
    if (!q) return;
    setSearching(true);
    try {
      const tracks = await searchCatalog(q, 8);
      setSearchResults(tracks);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const canProceed = matches.some((m) => m.appleTrack !== null);

  return (
    <section aria-label="Match tracks" style={{ marginTop: "1rem" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Matching</h2>
      <p style={{ color: "#444", marginBottom: "1rem" }}>
        Confirm or change the Apple Music track for each setlist entry. You can skip entries.
      </p>

      {loadingSuggestions && (
        <p role="status" style={{ color: "#666", marginBottom: "1rem" }}>
          Fetching suggestions…
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {matches.map((row, index) => (
          <li
            key={index}
            style={{
              padding: "0.75rem 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
              <div style={{ minWidth: "10rem" }}>
                <strong>{row.setlistEntry?.name ?? "—"}</strong>
                {row.setlistEntry?.artist && (
                  <span style={{ color: "#666", fontSize: "0.9em" }}> — {row.setlistEntry.artist}</span>
                )}
              </div>
              <div style={{ flex: "1 1 12rem" }}>
                {row.appleTrack ? (
                  <span>
                    → {row.appleTrack.name}
                    {row.appleTrack.artistName && (
                      <span style={{ color: "#666", fontSize: "0.9em" }}> · {row.appleTrack.artistName}</span>
                    )}
                  </span>
                ) : (
                  <span style={{ color: "#888" }}>No match</span>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchingIndex(index);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem", cursor: "pointer" }}
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setMatch(index, null)}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem", cursor: "pointer" }}
                >
                  Skip
                </button>
              </div>
            </div>

            {searchingIndex === index && (
              <div style={{ marginTop: "0.5rem", paddingLeft: "0.5rem", borderLeft: "3px solid #ccc" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Apple Music…"
                  onKeyDown={(e) => e.key === "Enter" && runSearch(index)}
                  style={{
                    width: "100%",
                    maxWidth: "20rem",
                    padding: "0.35rem 0.5rem",
                    marginRight: "0.5rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => runSearch(index)}
                  disabled={searching}
                  style={{ padding: "0.35rem 0.75rem", cursor: searching ? "wait" : "pointer" }}
                >
                  {searching ? "Searching…" : "Search"}
                </button>
                {searchResults.length > 0 && (
                  <ul style={{ listStyle: "none", margin: "0.5rem 0 0", padding: 0 }}>
                    {searchResults.map((track) => (
                      <li key={track.id} style={{ marginBottom: "0.25rem" }}>
                        <button
                          type="button"
                          onClick={() => setMatch(index, track)}
                          style={{
                            padding: "0.25rem 0",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            fontSize: "0.9rem",
                          }}
                        >
                          {track.name}
                          {track.artistName && ` · ${track.artistName}`}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={() => onProceedToCreatePlaylist(matches)}
          disabled={!canProceed}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: canProceed ? "pointer" : "not-allowed",
          }}
        >
          Create playlist →
        </button>
        {!canProceed && (
          <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9em" }}>
            Match at least one track to create a playlist.
          </p>
        )}
      </div>
    </section>
  );
}
