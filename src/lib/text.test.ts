import { countWords, normalizeText, stem, tokenize } from './text';

describe('normalizeText', () => {
  it('lowercases and keeps tech punctuation', () => {
    expect(normalizeText('C++, C# and Node.js!')).toBe('c++ c# and node.js');
  });
  it('keeps a leading dot only for .NET', () => {
    expect(normalizeText('Built on .NET. Used .foo')).toBe('built on .net used foo');
  });
  it('turns hyphens and slashes into spaces and drops sentence periods', () => {
    expect(normalizeText('Front-end CI/CD work.')).toBe('front end ci cd work');
  });
});

describe('tokenize / stem / countWords', () => {
  it('tokenizes normalized text', () => {
    expect(tokenize('  Hello,   World ')).toEqual(['hello', 'world']);
    expect(tokenize('')).toEqual([]);
  });
  it('folds common suffixes', () => {
    expect(stem('dashboards')).toBe('dashboard');
    expect(stem('libraries')).toBe('library');
    expect(stem('processes')).toBe('process');
    expect(stem('scheduling')).toBe('schedul');
    expect(stem('scheduled')).toBe('schedul');
    expect(stem('class')).toBe('class');
  });
  it('counts words', () => {
    expect(countWords(' one two\nthree ')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });
});
