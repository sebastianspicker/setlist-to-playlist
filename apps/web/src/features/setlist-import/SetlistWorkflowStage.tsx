import { type ReactNode, type RefObject } from 'react';
import type { MatchRow } from '@/features/matching/types';
import type { FlowStep, UseFlowStateResult } from './useFlowState';
import type { useSetlistImportWorkflowState } from './useSetlistImportWorkflowState';
import { ExportStage, MatchingStage, PreviewStage } from './SetlistWorkflowStages';

type SetlistImportState = ReturnType<typeof useSetlistImportWorkflowState>;

interface WorkflowStageProps {
  step: FlowStep;
  setlist: SetlistImportState['setlist'];
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goToMatching: UseFlowStateResult['goToMatching'];
  goToExport: UseFlowStateResult['goToExport'];
  goBackToPreview: UseFlowStateResult['goBackToPreview'];
  goBackToMatching: UseFlowStateResult['goBackToMatching'];
  updateMatchDraft: UseFlowStateResult['updateMatchDraft'];
  startAnotherSetlist: UseFlowStateResult['startAnotherSetlist'];
  importContent: ReactNode;
  onStartAnother: UseFlowStateResult['startAnotherSetlist'];
}

const STEP_NUMBERS = new Map<FlowStep, number>([
  ['import', 1],
  ['preview', 2],
  ['matching', 3],
  ['export', 4],
]);

export function getStepNumber(step: FlowStep): number {
  return STEP_NUMBERS.get(step) ?? 1;
}

export function WorkflowStage({
  step,
  setlist,
  matchRows,
  importContent,
  ...stageProps
}: WorkflowStageProps): ReactNode {
  if (!setlist || step === 'import') return importContent;
  if (step === 'matching') {
    return <MatchingStage setlist={setlist} matchRows={matchRows} {...stageProps} />;
  }
  if (step === 'preview') return <PreviewStage setlist={setlist} {...stageProps} />;
  if (!matchRows) return importContent;
  return <ExportStage setlist={setlist} matchRows={matchRows} {...stageProps} />;
}
