import type { FormEventHandler, RefObject } from 'react';
import { Button } from '@repo/ui';

interface ImportFormProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  loading: boolean;
  displayedError: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onValidateInput: () => boolean;
  onCancelLoad: () => void;
}

function SetlistInput({
  inputValue,
  setInputValue,
  loading,
  displayedError,
  inputRef,
  onValidateInput,
}: Omit<ImportFormProps, 'onSubmit' | 'onCancelLoad'>) {
  return (
    <div className="import-input-wrap">
      <label htmlFor="setlist-input" className="input-label">
        Setlist URL or ID
      </label>
      <input
        ref={inputRef}
        id="setlist-input"
        type="text"
        className="input"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
        }}
        onBlur={() => {
          if (inputValue.trim()) onValidateInput();
        }}
        placeholder="setlist.fm URL or 63de4613"
        disabled={loading}
        aria-invalid={Boolean(displayedError)}
        aria-describedby={displayedError ? 'setlist-error' : 'setlist-hint'}
      />
      {!displayedError ? (
        <p id="setlist-hint" className="input-hint">
          Example ID: <code>63de4613</code>
        </p>
      ) : null}
    </div>
  );
}

function ImportActions({
  loading,
  onCancelLoad,
}: Pick<ImportFormProps, 'loading' | 'onCancelLoad'>) {
  return (
    <div className="import-actions">
      <Button type="submit" loading={loading} loadingChildren="Fetching setlist…">
        Load setlist
      </Button>
      {loading ? (
        <Button type="button" variant="secondary" onClick={onCancelLoad}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

export function ImportForm({ onSubmit, ...props }: ImportFormProps) {
  return (
    <form onSubmit={onSubmit} className="import-form" noValidate>
      <SetlistInput {...props} />
      <ImportActions loading={props.loading} onCancelLoad={props.onCancelLoad} />
    </form>
  );
}
