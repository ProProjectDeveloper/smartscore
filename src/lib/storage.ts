/**
 * Small, defensive localStorage wrapper. Every read and write is guarded so
 * the app still works in private windows or when storage is blocked.
 */
export interface SavedAnalysis {
  id: string;
  title: string;
  createdAt: string;
  score: number;
  verdict: string;
  resume: string;
  job: string;
}

export interface Draft {
  resume: string;
  job: string;
  title: string;
}

export const HISTORY_KEY = 'smartscore.history.v1';
export const DRAFT_KEY = 'smartscore.draft.v1';
export const MAX_HISTORY = 25;

function read(key: string): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isSavedAnalysis(v: unknown): v is SavedAnalysis {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.score === 'number' &&
    typeof o.verdict === 'string' &&
    typeof o.resume === 'string' &&
    typeof o.job === 'string'
  );
}

export function loadHistory(): SavedAnalysis[] {
  const data = read(HISTORY_KEY);
  return Array.isArray(data) ? data.filter(isSavedAnalysis) : [];
}

export function saveHistory(items: SavedAnalysis[]): boolean {
  return write(HISTORY_KEY, items.slice(0, MAX_HISTORY));
}

/** Adds an entry to the front of the history, replacing any entry with identical inputs. */
export function addToHistory(items: SavedAnalysis[], entry: SavedAnalysis): SavedAnalysis[] {
  const rest = items.filter((i) => !(i.resume === entry.resume && i.job === entry.job));
  return [entry, ...rest].slice(0, MAX_HISTORY);
}

export function loadDraft(): Draft {
  const data = read(DRAFT_KEY);
  const o = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return { resume: str(o.resume), job: str(o.job), title: str(o.title) };
}

export function saveDraft(draft: Draft): boolean {
  return write(DRAFT_KEY, draft);
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
