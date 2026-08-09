import { Button } from '@repo/ui';
import type { ImportHistoryItem } from './importHistory';

interface ImportHistoryListProps {
  history: ImportHistoryItem[];
  onSelectHistoryItem: (item: ImportHistoryItem) => void;
  onClearHistory: () => void;
}

export function ImportHistoryList({
  history,
  onSelectHistoryItem,
  onClearHistory,
}: ImportHistoryListProps) {
  if (history.length === 0) return null;

  return (
    <section className="history-section" aria-labelledby="history-title">
      <div className="history-header">
        <h3 id="history-title">Recent imports</h3>
        <Button variant="secondary" className="button--compact" onClick={onClearHistory}>
          Clear history
        </Button>
      </div>
      <ul className="history-list">
        {history.map((item) => (
          <li key={`${item.setlistId}:${item.input}`}>
            <button
              type="button"
              className="history-item-button"
              onClick={() => {
                onSelectHistoryItem(item);
              }}
            >
              <strong>Setlist {item.setlistId}</strong>
              <span>{item.input === item.setlistId ? 'Setlist ID' : item.input}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
