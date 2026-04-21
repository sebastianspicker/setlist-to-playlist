import { describe, it, expect } from 'vitest';
import { normalizeTrackName } from '../src/matching/normalize';
import { buildSearchQuery } from '../src/matching/search-query';

describe('Unicode handling in normalizeTrackName', () => {
  it('preserves Latin Extended characters', () => {
    expect(normalizeTrackName('\u00c0 la claire fontaine')).toBe('\u00c0 la claire fontaine');
    expect(normalizeTrackName('Caf\u00e9')).toBe('Caf\u00e9');
    expect(normalizeTrackName('Na\u00efve')).toBe('Na\u00efve');
  });

  it('preserves Scandinavian characters', () => {
    expect(normalizeTrackName('\u00c5nglag\u00e5rd')).toBe('\u00c5nglag\u00e5rd');
    expect(normalizeTrackName('\u00d8resund')).toBe('\u00d8resund');
  });

  it('preserves Cyrillic characters', () => {
    expect(normalizeTrackName('\u041c\u043e\u0441\u043a\u0432\u0430')).toBe(
      '\u041c\u043e\u0441\u043a\u0432\u0430'
    );
  });

  it('preserves Arabic characters', () => {
    expect(normalizeTrackName('\u0645\u0648\u0633\u064a\u0642\u0649')).toBe(
      '\u0645\u0648\u0633\u064a\u0642\u0649'
    );
  });

  it('preserves Korean characters', () => {
    expect(normalizeTrackName('\ub178\ub798')).toBe('\ub178\ub798');
  });

  it('strips metadata from names with mixed scripts', () => {
    expect(normalizeTrackName('Caf\u00e9 (live version)')).toBe('Caf\u00e9');
    expect(normalizeTrackName('\u00d8resund (2019 Remastered)')).toBe('\u00d8resund');
    expect(normalizeTrackName('\ub178\ub798 feat. Artist')).toBe('\ub178\ub798');
  });

  it('handles combining diacritical marks', () => {
    // "e\u0301" is e + combining acute accent (different from "\u00e9" precomposed)
    const result = normalizeTrackName('Cafe\u0301');
    expect(result).toBe('Cafe\u0301');
  });

  it('handles zero-width characters gracefully', () => {
    // Zero-width space (\u200B) should not cause errors
    const result = normalizeTrackName('Song\u200BName');
    expect(result).toBeTruthy();
  });
});

describe('Unicode handling in buildSearchQuery', () => {
  it('preserves diacritics in search query', () => {
    expect(buildSearchQuery('Caf\u00e9', 'Bj\u00f6rk')).toBe('Caf\u00e9 Bj\u00f6rk');
  });

  it('preserves CJK in search query', () => {
    expect(buildSearchQuery('\u82b1\u706b', '\u7c73\u6d25\u7384\u5e2b')).toBe(
      '\u82b1\u706b \u7c73\u6d25\u7384\u5e2b'
    );
  });

  it('handles mixed scripts in query', () => {
    const result = buildSearchQuery('Hello \u4e16\u754c', 'Artist');
    expect(result).toBe('Hello \u4e16\u754c Artist');
  });

  it('normalizes and preserves unicode with metadata', () => {
    expect(buildSearchQuery('Caf\u00e9 (live)', 'Bj\u00f6rk')).toBe('Caf\u00e9 Bj\u00f6rk');
  });
});
