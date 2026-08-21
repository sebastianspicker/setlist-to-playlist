// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFlowState } from '../../src/features/setlist-import/useFlowState';

describe('setlist workflow state', () => {
  it('keeps a reviewed match draft through export and clears it for a new import', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const { result } = renderHook(() => useFlowState());
    const rows = [
      { setlistEntry: { name: 'Song', artist: 'Artist' }, appleTrack: null, status: 'unmatched' },
    ] as never[];
    act(() => result.current.goToExport(rows));
    expect(result.current).toMatchObject({ step: 'export', matchRows: rows });
    act(() => result.current.startAnotherSetlist());
    expect(result.current).toMatchObject({ step: 'import', matchRows: null });
    vi.unstubAllGlobals();
  });
});
