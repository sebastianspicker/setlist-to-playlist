import { type ReactNode, type RefObject } from 'react';
import { Button } from '@repo/ui';
import { SetlistAttribution } from '@/components/SetlistAttribution';
import { WorkflowStepHeader } from '@/components/WorkflowStepHeader';
import { MatchingWorkflow } from '@/features/matching/MatchingWorkflow';
import type { MatchRow } from '@/features/matching/types';
import { PlaylistExportWorkflow } from '@/features/playlist-export/PlaylistExportWorkflow';
import type { UseFlowStateResult } from './useFlowState';
import type { useSetlistImportWorkflowState } from './useSetlistImportWorkflowState';

type SetlistImportState = ReturnType<typeof useSetlistImportWorkflowState>;

interface MatchingStageProps {
  setlist: SetlistImportState['setlist'];
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goToExport: UseFlowStateResult['goToExport'];
  goBackToPreview: UseFlowStateResult['goBackToPreview'];
  updateMatchDraft: UseFlowStateResult['updateMatchDraft'];
}

interface ExportStageProps {
  setlist: SetlistImportState['setlist'];
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goBackToMatching: UseFlowStateResult['goBackToMatching'];
  onStartAnother: UseFlowStateResult['startAnotherSetlist'];
}

export function MatchingStage({
  setlist,
  matchRows,
  stepContainerRef,
  goToExport,
  goBackToPreview,
  updateMatchDraft,
}: MatchingStageProps): ReactNode {
  if (!setlist) return null;
  return (
    <section className="workflow-section" aria-label="Confirm each song">
      <WorkflowStepHeader
        step={3}
        title="Confirm each song"
        stageLabel="Step 3 of 4 · Match catalog tracks"
        context={`${setlist.artist}${setlist.venue ? ` at ${setlist.venue}` : ''}`}
        headingRef={stepContainerRef}
      />
      <Button variant="secondary" onClick={goBackToPreview} className="back-button">
        Back to preview
      </Button>
      <SetlistAttribution sourceUrl={setlist.sourceUrl} />
      <MatchingWorkflow
        setlist={setlist}
        initialDraft={matchRows}
        onMatchesChange={updateMatchDraft}
        onProceedToCreatePlaylist={goToExport}
      />
    </section>
  );
}

export function ExportStage({
  setlist,
  matchRows,
  stepContainerRef,
  goBackToMatching,
  onStartAnother,
}: ExportStageProps): ReactNode {
  if (!setlist || !matchRows) return null;
  return (
    <section className="workflow-section" aria-label="Export playlist">
      <WorkflowStepHeader
        step={4}
        title="Save to Apple Music"
        context={`${setlist.artist} · ${matchRows.filter((row) => row.appleTrack).length} selected`}
        headingRef={stepContainerRef}
      />
      <PlaylistExportWorkflow
        setlist={setlist}
        matchRows={matchRows}
        onBack={goBackToMatching}
        onStartAnother={onStartAnother}
      />
      <SetlistAttribution sourceUrl={setlist.sourceUrl} />
    </section>
  );
}
