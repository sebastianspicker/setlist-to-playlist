import { type ReactNode, type RefObject } from 'react';
import { ImportStep, type ImportStepProps } from './ImportStep';
import { PreviewStep } from './PreviewStep';
import type { UseFlowStateResult } from './useFlowState';
import type { useSetlistImportWorkflowState } from './useSetlistImportWorkflowState';

type SetlistImportState = ReturnType<typeof useSetlistImportWorkflowState>;

interface ImportStageProps {
  state: SetlistImportState;
  displayedError: string | null;
  retryable: boolean;
  historyAnnouncement: string;
  inputRef: RefObject<HTMLInputElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  onSubmit: ImportStepProps['onSubmit'];
  onRetry: ImportStepProps['onRetry'];
  onSelectHistoryItem: ImportStepProps['onSelectHistoryItem'];
  onClearHistory: ImportStepProps['onClearHistory'];
}

interface PreviewStageProps {
  setlist: SetlistImportState['setlist'];
  stepContainerRef: RefObject<HTMLElement | null>;
  goToMatching: UseFlowStateResult['goToMatching'];
  startAnotherSetlist: UseFlowStateResult['startAnotherSetlist'];
}

export { ExportStage, MatchingStage } from './SetlistWorkflowExportStages';

export function ImportStage(props: ImportStageProps): ReactNode {
  const { state } = props;
  return (
    <ImportStep
      inputValue={state.inputValue}
      setInputValue={state.setInputValue}
      loading={state.loading}
      displayedError={props.displayedError}
      retryable={props.retryable}
      history={state.history}
      historyAnnouncement={props.historyAnnouncement}
      inputRef={props.inputRef}
      headingRef={props.headingRef}
      onSubmit={props.onSubmit}
      onValidateInput={state.validateInput}
      onCancelLoad={state.cancelLoad}
      onRetry={props.onRetry}
      onSelectHistoryItem={props.onSelectHistoryItem}
      onClearHistory={props.onClearHistory}
    />
  );
}

export function PreviewStage({
  setlist,
  stepContainerRef,
  goToMatching,
  startAnotherSetlist,
}: PreviewStageProps): ReactNode {
  if (!setlist) return null;
  return (
    <PreviewStep
      setlist={setlist}
      headingRef={stepContainerRef}
      onChangeSetlist={startAnotherSetlist}
      onMatchSongs={goToMatching}
    />
  );
}
