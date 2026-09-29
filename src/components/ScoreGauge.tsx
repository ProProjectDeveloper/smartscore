import { bandFor } from '../lib/score';

interface Props {
  score: number;
  verdict: string;
}

/** Circular 0-100 gauge. */
export function ScoreGauge({ score, verdict }: Props) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className={`gauge band-${bandFor(score)}`} role="img" aria-label={`Match score ${score} out of 100, ${verdict}`}>
      <svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="gauge-track" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="gauge-fill"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="gauge-label">
        <span className="gauge-score" data-testid="score">
          {score}
        </span>
        <span className="gauge-verdict">{verdict}</span>
      </div>
    </div>
  );
}
