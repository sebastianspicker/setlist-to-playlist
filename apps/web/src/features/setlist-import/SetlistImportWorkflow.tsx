'use client';

import { useRef, useState } from 'react';
import { WorkflowRail } from '@/components/WorkflowRail';
import { ImportStage } from './SetlistWorkflowStages';
import { getStepNumber, WorkflowStage } from './SetlistWorkflowStage';
import { useFlowState } from './useFlowState';
import { useSetlistImportWorkflowState } from './useSetlistImportWorkflowState';
import { useSetlistImportHandlers } from './useSetlistImportHandlers';

/** Coordinates the import stage with the downstream matching and export stages. */
export function SetlistImportWorkflow() {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [historyAnnouncement, setHistoryAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const importState = useSetlistImportWorkflowState();
  const flow = useFlowState();
  const handlers = useSetlistImportHandlers({
    importState,
    inputRef,
    goToPreview: flow.goToPreview,
    startAnotherSetlist: flow.startAnotherSetlist,
    setSubmissionError,
    setHistoryAnnouncement,
  });
  const displayedError = importState.error?.message ?? submissionError;
  const retryable = importState.error?.retryable ?? Boolean(submissionError);

  return (
    <div className={`workflow-shell workflow-shell--${flow.step}`}>
      <WorkflowRail currentStep={getStepNumber(flow.step)} />
      <div className={`workflow-stage workflow-stage--${flow.step}`}>
        <WorkflowStage
          step={flow.step}
          setlist={importState.setlist}
          matchRows={flow.matchRows}
          stepContainerRef={flow.stepContainerRef}
          goToMatching={flow.goToMatching}
          goToExport={flow.goToExport}
          goBackToPreview={flow.goBackToPreview}
          goBackToMatching={flow.goBackToMatching}
          updateMatchDraft={flow.updateMatchDraft}
          startAnotherSetlist={flow.startAnotherSetlist}
          importContent={
            <ImportStage
              state={importState}
              displayedError={displayedError}
              retryable={retryable}
              historyAnnouncement={historyAnnouncement}
              inputRef={inputRef}
              headingRef={flow.stepContainerRef}
              onSubmit={handlers.handleSubmit}
              onRetry={handlers.handleRetry}
              onSelectHistoryItem={handlers.handleSelectHistoryItem}
              onClearHistory={handlers.handleClearHistory}
            />
          }
          onStartAnother={handlers.handleStartAnother}
        />
      </div>
    </div>
  );
}
