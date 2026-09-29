import {
  DRAFT_KEY,
  HISTORY_KEY,
  MAX_HISTORY,
  addToHistory,
  loadDraft,
  loadHistory,
  newId,
  saveDraft,
  saveHistory,
  type SavedAnalysis,
} from './storage';

const entry = (i: number, overrides: Partial<SavedAnalysis> = {}): SavedAnalysis => ({
  id: `id-${i}`,
  title: `Job ${i}`,
  createdAt: new Date(2026, 0, i + 1).toISOString(),
  score: i,
  verdict: 'Weak match',
  resume: `resume ${i}`,
  job: `job ${i}`,
  ...overrides,
});

beforeEach(() => localStorage.clear());

describe('history', () => {
  it('round-trips through localStorage', () => {
    saveHistory([entry(1), entry(2)]);
    expect(loadHistory().map((e) => e.id)).toEqual(['id-1', 'id-2']);
  });

  it('ignores corrupt or malformed data', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory()).toEqual([]);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry(1), { id: 3 }, null]));
    expect(loadHistory().map((e) => e.id)).toEqual(['id-1']);
  });

  it('adds newest first, dedupes identical inputs, and caps length', () => {
    let items: SavedAnalysis[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) items = addToHistory(items, entry(i));
    expect(items).toHaveLength(MAX_HISTORY);
    expect(items[0].id).toBe(`id-${MAX_HISTORY + 4}`);
    const again = addToHistory(items, entry(99, { resume: items[3].resume, job: items[3].job }));
    expect(again).toHaveLength(MAX_HISTORY);
    expect(again[0].id).toBe('id-99');
    expect(again.filter((e) => e.resume === items[3].resume)).toHaveLength(1);
  });

  it('survives storage that throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(saveHistory([entry(1)])).toBe(false);
    spy.mockRestore();
  });
});

describe('draft', () => {
  it('round-trips and defaults missing fields', () => {
    expect(loadDraft()).toEqual({ resume: '', job: '', title: '' });
    saveDraft({ resume: 'r', job: 'j', title: 't' });
    expect(loadDraft()).toEqual({ resume: 'r', job: 'j', title: 't' });
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ resume: 5 }));
    expect(loadDraft()).toEqual({ resume: '', job: '', title: '' });
  });
});

it('newId returns unique ids', () => {
  expect(newId()).not.toBe(newId());
});
