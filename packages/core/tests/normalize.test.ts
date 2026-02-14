import { describe, it, expect } from 'vitest';
import { normalizeTrackName } from '../src/matching/normalize';

describe('normalizeTrackName', () => {
  it('strips parentheticals', () => {
    expect(normalizeTrackName('Song (live)')).toBe('Song');
    expect(normalizeTrackName('Song (acoustic)')).toBe('Song');
  });

  it('strips feat. segment', () => {
    expect(normalizeTrackName('Song feat. Other Artist')).toBe('Song');
  });

  it('returns empty for empty input', () => {
    expect(normalizeTrackName('')).toBe('');
  });

  it('normalizes spaces', () => {
    expect(normalizeTrackName('  Hello   World  ')).toBe('Hello World');
  });
});
