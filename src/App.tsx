import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { Results } from './components/Results';
import { TextInput } from './components/TextInput';
import { SAMPLE_JOB, SAMPLE_RESUME, SAMPLE_TITLE } from './lib/samples';
import { scoreMatch } from './lib/score';
import {
  addToHistory,
  loadDraft,
  loadHistory,
  newId,
  saveDraft,
  saveHistory,
  type SavedAnalysis,
} from './lib/storage';

export default function App() {
  const [initialDraft] = useState(loadDraft);
  const [resume, setResume] = useState(initialDraft.resume);
  const [job, setJob] = useState(initialDraft.job);
  const [title, setTitle] = useState(initialDraft.title);
  const [history, setHistory] = useState<SavedAnalysis[]>(loadHistory);

  useEffect(() => {
    saveDraft({ resume, job, title });
  }, [resume, job, title]);

  const deferredResume = useDeferredValue(resume);
  const deferredJob = useDeferredValue(job);
  const ready = deferredResume.trim().length > 0 && deferredJob.trim().length > 0;
  const result = useMemo(
    () => (ready ? scoreMatch(deferredResume, deferredJob) : null),
    [ready, deferredResume, deferredJob],
  );

  const alreadySaved = history.some((h) => h.resume === resume && h.job === job);

  const updateHistory = useCallback((next: SavedAnalysis[]) => {
    setHistory(next);
    saveHistory(next);
  }, []);

  function handleSave() {
    if (!result) return;
    const entry: SavedAnalysis = {
      id: newId(),
      title: title.trim() || `Untitled analysis (${result.score})`,
      createdAt: new Date().toISOString(),
      score: result.score,
      verdict: result.verdict,
      resume,
      job,
    };
    updateHistory(addToHistory(history, entry));
  }

  function loadSample() {
    setResume(SAMPLE_RESUME);
    setJob(SAMPLE_JOB);
    setTitle(SAMPLE_TITLE);
  }

  function loadEntry(item: SavedAnalysis) {
    setResume(item.resume);
    setJob(item.job);
    setTitle(item.title);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            Smart<span>Score</span>
          </h1>
          <p className="muted">
            See how well your resume matches a job description, what is missing, and what to fix. Everything runs in
            your browser; nothing is uploaded.
          </p>
        </div>
        <button type="button" className="btn" onClick={loadSample}>
          Try a sample
        </button>
      </header>

      <main>
        <div className="panel title-panel">
          <label htmlFor="title">Label for this analysis (optional)</label>
          <input
            id="title"
            type="text"
            value={title}
            placeholder="e.g. Data Analyst, remote"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="inputs">
          <TextInput
            label="Your resume"
            hint="Paste the plain text of your resume."
            value={resume}
            onChange={setResume}
            placeholder="Paste your resume here..."
          />
          <TextInput
            label="Job description"
            hint="Paste the full posting, including requirements and nice-to-haves."
            value={job}
            onChange={setJob}
            placeholder="Paste the job description here..."
          />
        </div>

        {result ? (
          <Results result={result} title={title} onSave={handleSave} saved={alreadySaved} />
        ) : (
          <section className="panel empty">
            <p>Paste your resume and a job description above to see your match score.</p>
            <p className="muted small">
              Scoring weighs required skills (50%), nice-to-have skills (15%), posting keywords (25%), and years of
              experience (10%). Parts the posting does not mention are left out and the rest rescaled.
            </p>
          </section>
        )}

        <HistoryPanel
          items={history}
          onLoad={loadEntry}
          onDelete={(id) => updateHistory(history.filter((h) => h.id !== id))}
          onClear={() => updateHistory([])}
        />
      </main>

      <footer className="muted small">
        SmartScore is a heuristic guide, not a hiring prediction. Only claim skills you actually have.
      </footer>
    </div>
  );
}
