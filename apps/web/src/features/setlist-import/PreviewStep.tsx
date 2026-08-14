'use client';

import type { RefObject } from 'react';
import type { Setlist } from '@repo/core';
import { Button } from '@repo/ui';
import { WorkflowStepHeader } from '@/components/WorkflowStepHeader';
import { SetlistPreview } from './SetlistPreview';

export interface PreviewStepProps {
  setlist: Setlist;
  headingRef: RefObject<HTMLElement | null>;
  onChangeSetlist: () => void;
  onMatchSongs: () => void;
}

export function PreviewStep({
  setlist,
  headingRef,
  onChangeSetlist,
  onMatchSongs,
}: PreviewStepProps) {
  const songCount = setlist.sets.reduce((count, set) => count + set.length, 0);

  return (
    <section className="workflow-section" aria-label="Review setlist">
      <WorkflowStepHeader
        step={2}
        title="Review setlist"
        context="Confirm the show and song order before matching."
        headingRef={headingRef}
      />
      <SetlistPreview setlist={setlist} />
      <div className="step-actions">
        <Button variant="secondary" onClick={onChangeSetlist}>
          Change setlist
        </Button>
        <Button onClick={onMatchSongs} disabled={songCount === 0}>
          Match songs on Apple Music
        </Button>
      </div>
    </section>
  );
}
