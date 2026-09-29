import { SAMPLE_JOB, SAMPLE_RESUME } from './samples';
import { BASE_WEIGHTS, scoreMatch, verdictFor } from './score';
import { formatReport } from './report';

const now = new Date('2026-09-29');

const JOB = `Backend Engineer

Requirements
- 5+ years of professional experience
- Python, SQL, and Docker
- Building REST APIs

Nice to have
- Kubernetes
- Terraform`;

describe('scoreMatch', () => {
  it('is deterministic', () => {
    expect(scoreMatch(SAMPLE_RESUME, SAMPLE_JOB, { now })).toEqual(scoreMatch(SAMPLE_RESUME, SAMPLE_JOB, { now }));
  });

  it('scores a perfect resume at or near 100', () => {
    const resume = `Backend engineer, 2015 - Present. Python, SQL, Docker, REST APIs, Kubernetes, Terraform.
Professional backend engineer building services.`;
    const r = scoreMatch(resume, JOB, { now });
    expect(r.required.missing).toEqual([]);
    expect(r.preferred.missing).toEqual([]);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.verdict).toBe('Strong match');
  });

  it('scores an unrelated resume low and lists missing skills', () => {
    const r = scoreMatch('Pastry chef. Croissants and sourdough since 2020 - 2022.', JOB, { now });
    expect(r.score).toBeLessThan(25);
    expect(r.required.missing.map((m) => m.id).sort()).toEqual(['docker', 'python', 'rest', 'sql']);
    expect(r.suggestions[0].priority).toBe('high');
    expect(r.suggestions[0].text).toMatch(/Required skills not found/);
  });

  it('ranks a better resume above a weaker one', () => {
    const weak = scoreMatch('Python developer 2023 - Present.', JOB, { now });
    const strong = scoreMatch('Python, SQL and Docker developer building REST APIs, 2018 - Present.', JOB, { now });
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it('drops components with nothing to measure and renormalizes weights', () => {
    const r = scoreMatch('I know React.', 'We need React and TypeScript.', { now });
    const byKey = Object.fromEntries(r.components.map((c) => [c.key, c]));
    expect(byKey.preferred.score).toBeNull();
    expect(byKey.preferred.weight).toBe(0);
    expect(byKey.experience.score).toBeNull();
    const total = r.components.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeCloseTo(1);
    expect(byKey.required.weight).toBeCloseTo(BASE_WEIGHTS.required / (BASE_WEIGHTS.required + BASE_WEIGHTS.keywords));
    expect(byKey.required.score).toBe(0.5);
  });

  it('scores experience proportionally and flags a gap', () => {
    const r = scoreMatch('Python SQL Docker REST APIs 2024 - Present', JOB, { now });
    expect(r.experience).toEqual({ requiredYears: 5, resumeYears: 2 });
    const exp = r.components.find((c) => c.key === 'experience')!;
    expect(exp.score).toBeCloseTo(0.4);
    expect(r.suggestions.some((sg) => /asks for 5\+ years; your resume shows about 2/.test(sg.text))).toBe(true);
  });

  it('gives half credit for experience when the resume has no dates', () => {
    const r = scoreMatch('Python and SQL', JOB, { now });
    expect(r.components.find((c) => c.key === 'experience')!.score).toBe(0.5);
    expect(r.suggestions.some((sg) => /Add start and end years/.test(sg.text))).toBe(true);
  });

  it('lists resume skills the posting does not mention', () => {
    const r = scoreMatch('Python, Rust, Rust, and Go (golang)', JOB, { now });
    expect(r.extraSkills.map((s) => s.id)).toEqual(['rust', 'go']);
  });

  it('asks for input when either side is empty', () => {
    const r = scoreMatch('', JOB, { now });
    expect(r.score).toBe(0);
    expect(r.suggestions).toEqual([
      { priority: 'high', text: 'Paste both your resume and the job description to get a score.' },
    ]);
    expect(scoreMatch('something', '', { now }).score).toBe(0);
  });

  it('suggests quantifying results only when no numbers are present', () => {
    const plain = scoreMatch('Python developer. Improved the system a lot.', JOB, { now });
    expect(plain.suggestions.some((sg) => /quantified/i.test(sg.text))).toBe(true);
    const quantified = scoreMatch('Python developer. Cut latency by 40%.', JOB, { now });
    expect(quantified.suggestions.some((sg) => /quantified/i.test(sg.text))).toBe(false);
  });

  it('orders suggestions by priority', () => {
    const order = { high: 0, medium: 1, low: 2 };
    const r = scoreMatch(SAMPLE_RESUME, SAMPLE_JOB, { now });
    const ranks = r.suggestions.map((sg) => order[sg.priority]);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it('gives the sample pair a reasonable score', () => {
    const r = scoreMatch(SAMPLE_RESUME, SAMPLE_JOB, { now });
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.score).toBeLessThan(90);
    expect(r.required.matched.map((m) => m.id)).toEqual(expect.arrayContaining(['react', 'typescript', 'redux']));
    expect(r.preferred.missing.map((m) => m.id)).toEqual(expect.arrayContaining(['graphql', 'nextjs']));
    expect(r.keywords.missing).not.toContain('brightpath');
  });
});

describe('verdictFor', () => {
  it('maps score bands to labels', () => {
    expect(verdictFor(95)).toBe('Strong match');
    expect(verdictFor(80)).toBe('Strong match');
    expect(verdictFor(79)).toBe('Good match');
    expect(verdictFor(40)).toBe('Partial match');
    expect(verdictFor(39)).toBe('Weak match');
  });
});

describe('formatReport', () => {
  it('renders a markdown summary', () => {
    const r = scoreMatch('Python and SQL, 2019 - 2021', JOB, { now });
    const text = formatReport(r, 'Backend role');
    expect(text.startsWith(`# Backend role: ${r.score}/100 (${r.verdict})`)).toBe(true);
    expect(text).toContain('- Required, missing: ');
    expect(text).toContain('Docker');
    expect(text).toContain('## Suggestions');
  });
});
