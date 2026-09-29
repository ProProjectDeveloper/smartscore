import type { SavedAnalysis } from '../lib/storage';
import { bandFor } from '../lib/score';

interface Props {
  items: SavedAnalysis[];
  onLoad: (item: SavedAnalysis) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function HistoryPanel({ items, onLoad, onDelete, onClear }: Props) {
  return (
    <section className="panel" aria-labelledby="history-heading">
      <div className="input-head">
        <h2 id="history-heading">History</h2>
        {items.length > 0 && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              if (window.confirm('Delete all saved analyses?')) onClear();
            }}
          >
            Clear all
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="muted small">Saved analyses appear here. They stay in this browser only.</p>
      ) : (
        <ul className="history">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="history-item" onClick={() => onLoad(item)}>
                <span className={`pill band-${bandFor(item.score)}`}>{item.score}</span>
                <span className="history-text">
                  <span className="history-title">{item.title}</span>
                  <span className="muted small">{dateFmt.format(new Date(item.createdAt))}</span>
                </span>
              </button>
              <button
                type="button"
                className="btn ghost small"
                aria-label={`Delete ${item.title}`}
                onClick={() => onDelete(item.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
