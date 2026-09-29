import { useState } from 'react';
import { formatReport } from '../lib/report';
import type { MatchResult, SkillMatch } from '../lib/score';
import { ScoreGauge } from './ScoreGauge';

interface Props {
  result: MatchResult;
  title: string;
  onSave: () => void;
  saved: boolean;
}

function Chips({ items, kind, empty }: { items: SkillMatch[] | string[]; kind: 'hit' | 'miss' | 'extra'; empty: string }) {
  if (items.length === 0) return <p className="muted small">{empty}</p>;
  return (
    <ul className="chips">
      {items.map((item) => {
        const label = typeof item === 'string' ? item : item.label;
        const tip =
          typeof item === 'string'
            ? undefined
            : `${item.category}. Posting: ${item.jobMentions}x, resume: ${item.resumeMentions}x`;
        return (
          <li key={label} className={`chip chip-${kind}`} title={tip}>
            {kind === 'hit' ? '✓ ' : kind === 'miss' ? '✗ ' : ''}
            {label}
          </li>
        );
      })}
    </ul>
  );
}

export function Results({ result, title, onSave, saved }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(formatReport(result, title || 'Resume match'));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.setTimeout(() => setCopyState('idle'), 2000);
  }

  return (
    <section className="panel results" aria-labelledby="results-heading">
      <h2 id="results-heading" className="visually-hidden">
        Results
      </h2>
      <div className="results-top">
        <ScoreGauge score={result.score} verdict={result.verdict} />
        <div className="breakdown">
          {result.components.map((c) => (
            <div key={c.key} className={`bar-row${c.score === null ? ' inactive' : ''}`}>
              <div className="bar-head">
                <span>{c.label}</span>
                <span className="muted small">
                  {c.score === null ? 'not scored' : `${Math.round(c.score * 100)}%`}
                  {c.weight > 0 && ` · weight ${Math.round(c.weight * 100)}%`}
                </span>
              </div>
              <div className="bar" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${Math.round((c.score ?? 0) * 100)}%` }} />
              </div>
              <p className="muted small">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="actions-row">
        <button type="button" className="btn primary" onClick={onSave} disabled={saved}>
          {saved ? 'Saved to history' : 'Save to history'}
        </button>
        <button type="button" className="btn" onClick={copyReport}>
          {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy report'}
        </button>
      </div>

      <div className="section">
        <h3>Suggestions</h3>
        <ol className="suggestions">
          {result.suggestions.map((sg, i) => (
            <li key={i} className={`sg sg-${sg.priority}`}>
              <span className="sg-tag">{sg.priority}</span>
              <span>{sg.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid-2">
        <div className="section">
          <h3>Required skills</h3>
          <Chips items={result.required.missing} kind="miss" empty="Nothing missing." />
          <Chips items={result.required.matched} kind="hit" empty="No required skills matched yet." />
        </div>
        <div className="section">
          <h3>Nice-to-have skills</h3>
          <Chips items={result.preferred.missing} kind="miss" empty="Nothing missing." />
          <Chips items={result.preferred.matched} kind="hit" empty="None matched yet." />
        </div>
        <div className="section">
          <h3>Posting keywords</h3>
          <Chips items={result.keywords.missing} kind="miss" empty="All top keywords present." />
          <Chips items={result.keywords.matched} kind="hit" empty="None present yet." />
        </div>
        <div className="section">
          <h3>Other skills on your resume</h3>
          <p className="muted small">Not mentioned in this posting. Consider trimming if space is tight.</p>
          <Chips items={result.extraSkills} kind="extra" empty="None." />
        </div>
      </div>
    </section>
  );
}
