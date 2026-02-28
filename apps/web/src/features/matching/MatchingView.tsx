"use client";

import { useRef, useState } from "react";
import { buildSearchQuery } from "@repo/core";
import type { Setlist } from "@repo/core";
import { FlowStepIndicator } from "@/components/FlowStepIndicator";
import { LoadingButton } from "@/components/LoadingButton";
import { SectionTitle } from "@/components/SectionTitle";
import { StatusText } from "@/components/StatusText";
import type { AppleMusicTrack } from "@/lib/musickit";
import { searchCatalog } from "@/lib/musickit";
import { MatchRowItem } from "./MatchRowItem";
import { MatchingBulkActions } from "./MatchingBulkActions";
import type { MatchRow } from "./types";
import { useMatchingSuggestions } from "./useMatchingSuggestions";

export type { MatchRow } from "./types";

export interface MatchingViewProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
}

export function MatchingView({ setlist, onProceedToCreatePlaylist }: MatchingViewProps) {
  const {
    matches,
    loadingSuggestions,
    suggestionError,
    setMatch,
    autoMatchAll,
    resetMatches,
    skipUnmatched,
  } = useMatchingSuggestions(setlist);

  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchRunIdRef = useRef(0);

  async function runSearch(index: number) {
    const row = matches[index];
    if (index < 0 || index >= matches.length || !row?.setlistEntry) return;
    const q = searchQuery.trim() || buildSearchQuery(row.setlistEntry.name, row.setlistEntry.artist);
    if (!q) return;
    const runId = Date.now();
    searchRunIdRef.current = runId;
    setSearching(true);
    setSearchError(false);
    try {
      const tracks = await searchCatalog(q, 8);
      if (searchRunIdRef.current !== runId) return;
      setSearchResults(tracks);
    } catch {
      if (searchRunIdRef.current !== runId) return;
      setSearchResults([]);
      setSearchError(true);
    } finally {
      if (searchRunIdRef.current === runId) {
        setSearching(false);
      }
    }
  }

  function openSearch(index: number) {
    setSearchingIndex(index);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(false);
  }

  function chooseTrack(index: number, track: AppleMusicTrack) {
    setMatch(index, track);
    setSearchingIndex(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  function skipTrack(index: number) {
    setMatch(index, null);
    if (searchingIndex === index) {
      setSearchingIndex(null);
      setSearchQuery("");
      setSearchResults([]);
    }
  }

  const canProceed = matches.some((m) => m.appleTrack !== null);

  return (
    <section aria-label="Match tracks" className="matching-section">
      <FlowStepIndicator step={3} total={4} label="Matching" />
      <SectionTitle>Matching</SectionTitle>
      <p className="muted-block">
        Confirm or change the Apple Music track for each setlist entry. You can skip entries.
      </p>

      <MatchingBulkActions
        loading={loadingSuggestions}
        onAutoMatchAll={() => void autoMatchAll()}
        onSkipUnmatched={skipUnmatched}
        onReset={resetMatches}
      />

      {loadingSuggestions && (
        <StatusText style={{ marginBottom: "1rem" }}>Fetching suggestions…</StatusText>
      )}

      {suggestionError && !loadingSuggestions && (
        <p role="alert" className="warning-banner">
          Note: Some suggestions could not be loaded. You can manually search for those tracks.
        </p>
      )}

      <ul className="matching-list">
        {matches.map((row, index) => (
          <MatchRowItem
            key={`${row.setlistEntry.name}-${index}`}
            row={row}
            index={index}
            searchingIndex={searchingIndex}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searching={searching}
            searchError={searchError}
            onOpenSearch={openSearch}
            onSkip={skipTrack}
            onSearchQueryChange={setSearchQuery}
            onSearch={runSearch}
            onChoose={chooseTrack}
          />
        ))}
      </ul>

      <div style={{ marginTop: "1.5rem" }}>
        <LoadingButton
          onClick={() => onProceedToCreatePlaylist(matches)}
          disabled={!canProceed}
          title="Continue to create the playlist in Apple Music"
        >
          Create playlist →
        </LoadingButton>
        {!canProceed && (
          <p className="muted-block" style={{ marginTop: "0.5rem" }}>
            Match at least one track to create a playlist.
          </p>
        )}
      </div>
    </section>
  );
}
