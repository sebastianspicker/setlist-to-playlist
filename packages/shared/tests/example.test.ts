import { describe, it, expect } from 'vitest';
import { API_ERROR } from '../src/types/api';
import { SETLIST_FM_BASE_URL } from '../src/utils/constants';

describe('shared', () => {
  it('exports API_ERROR', () => {
    expect(API_ERROR.UNAUTHORIZED).toBe('UNAUTHORIZED');
  });
  it('exports setlist base URL', () => {
    expect(SETLIST_FM_BASE_URL).toContain('setlist.fm');
  });
});
