import {
  estimateResumeYears,
  extractJobSkills,
  extractKeywords,
  extractRequiredYears,
  findSkills,
  properNouns,
} from './extract';

describe('findSkills', () => {
  it('maps aliases to canonical skills and counts mentions', () => {
    const found = findSkills('ReactJS and React.js, plus JS and TypeScript. Deployed on k8s.');
    expect(found.get('react')).toBe(2);
    expect(found.get('javascript')).toBe(1);
    expect(found.get('typescript')).toBe(1);
    expect(found.get('kubernetes')).toBe(1);
  });

  it('distinguishes Java from JavaScript and C++ from C#', () => {
    const found = findSkills('JavaScript only. C# and C++.');
    expect(found.has('java')).toBe(false);
    expect(found.get('csharp')).toBe(1);
    expect(found.get('cpp')).toBe(1);
  });

  it('does not match ambiguous short words for C, R, and Go', () => {
    const found = findSkills('Go above and beyond for C-level clients, see appendix R.');
    expect(found.has('go')).toBe(false);
    expect(found.has('c')).toBe(false);
    expect(found.has('r')).toBe(false);
    expect(findSkills('Services written in Golang').has('go')).toBe(true);
  });

  it('does not match a skill inside a longer word', () => {
    expect(findSkills('PostgreSQL').has('sql')).toBe(false);
    expect(findSkills('PostgreSQL').has('postgresql')).toBe(true);
  });

  it('handles hyphenated and multi-word phrases', () => {
    const found = findSkills('Strong problem-solving; CI/CD with GitHub Actions; test-driven development');
    expect(found.has('problemsolving')).toBe(true);
    expect(found.has('cicd')).toBe(true);
    expect(found.has('tdd')).toBe(true);
  });

  it('returns an empty map for empty text', () => {
    expect(findSkills('   ').size).toBe(0);
  });
});

describe('extractJobSkills', () => {
  it('splits required and preferred sections by heading', () => {
    const jd = `Requirements
- Python and SQL
- Docker

Nice to have
- Kubernetes
- Terraform`;
    const { required, preferred } = extractJobSkills(jd);
    expect([...required.keys()].sort()).toEqual(['docker', 'python', 'sql']);
    expect([...preferred.keys()].sort()).toEqual(['kubernetes', 'terraform']);
  });

  it('treats inline cues as preferred', () => {
    const { required, preferred } = extractJobSkills('Must know React. GraphQL experience is a plus.\nAlso Redis is a plus');
    expect(preferred.has('redis')).toBe(true);
    expect(preferred.has('graphql')).toBe(true);
    expect(required.has('react')).toBe(true);
    expect(required.has('graphql')).toBe(false);
  });

  it('promotes a skill found in both sections to required', () => {
    const jd = `Requirements:\nReact\nPreferred:\nReact Native, Redux`;
    const { required, preferred } = extractJobSkills(jd);
    expect(required.get('react')).toBe(2);
    expect(preferred.has('react')).toBe(false);
    expect(preferred.has('redux')).toBe(true);
  });

  it('switches back to required when a later required heading appears', () => {
    const jd = `Preferred Qualifications\nKafka\nWhat you'll need\nJava`;
    const { required, preferred } = extractJobSkills(jd);
    expect(preferred.has('kafka')).toBe(true);
    expect(required.has('java')).toBe(true);
  });
});

describe('extractRequiredYears', () => {
  it('finds the largest experience requirement', () => {
    expect(extractRequiredYears('5+ years of software experience. 2+ years with React experience.')).toBe(5);
    expect(extractRequiredYears('Requires 3-5 years of professional experience')).toBe(3);
  });
  it('ignores year counts unrelated to experience', () => {
    expect(extractRequiredYears('We have been in business for 20 years.')).toBeNull();
    expect(extractRequiredYears('No numbers here')).toBeNull();
  });
});

describe('estimateResumeYears', () => {
  const now = new Date('2026-06-01');
  it('merges overlapping date ranges', () => {
    const text = 'Role A 2015 - 2018\nRole B 2017 - 2020\nRole C Jan 2022 - Present';
    // 2015-2020 (5) + 2022-2026 (4)
    expect(estimateResumeYears(text, now)).toBe(9);
  });
  it('uses explicit claims when larger', () => {
    expect(estimateResumeYears('12 years of experience. Current role 2023 - present', now)).toBe(12);
  });
  it('handles month names and numeric months', () => {
    expect(estimateResumeYears('Mar 2019 – Jun 2021', now)).toBe(2);
    expect(estimateResumeYears('03/2019 - 06/2021', now)).toBe(2);
  });
  it('returns null when nothing is found', () => {
    expect(estimateResumeYears('A resume with no dates', now)).toBeNull();
  });
});

describe('extractKeywords', () => {
  it('ranks by frequency, skips stopwords and detected skills', () => {
    const jd = 'Scheduling platform for clinics. Clinics rely on scheduling. We need React for clinics.';
    const kws = extractKeywords(jd, 3);
    expect(kws.map((k) => k.word)).toEqual(['clinics', 'scheduling', 'platform']);
    expect(kws.find((k) => k.word === 'react')).toBeUndefined();
    expect(kws[0].count).toBe(3);
  });
});

describe('properNouns', () => {
  it('flags mid-sentence capitalized words that never appear lowercase', () => {
    const names = properNouns('Join Brightpath Labs today.\nWe build software. Software matters to Brightpath.');
    expect(names.has('brightpath')).toBe(true);
    expect(names.has('labs')).toBe(true);
    expect(names.has('software')).toBe(false);
    expect(names.has('join')).toBe(false);
  });

  it('keeps proper nouns out of keywords', () => {
    const kws = extractKeywords('Brightpath needs scheduling help. At Brightpath, scheduling matters.').map((k) => k.word);
    expect(kws).toContain('scheduling');
    expect(kws).not.toContain('brightpath');
  });
});
