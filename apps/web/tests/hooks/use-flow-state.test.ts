// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../../src/features/setlist-import/useFlowState';
import type { MatchRow } from '../../src/features/matching/types';

const mockRows: MatchRow[] = [
  {
    setlistEntry: { name: 'Song A', artist: 'Artist A' },
    appleTrack: { id: '1', name: 'Song A', artistName: 'Artist A' },
    status: 'matched',
  },
];

describe('useFlowState', () => {
  it('starts at import step with null matchRows', () => {
    const { result } = renderHook(() => useFlowState());
    expect(result.current.step).toBe('import');
    expect(result.current.matchRows).toBeNull();
  });

  it('goToPreview transitions to preview', () => {
    const { result } = renderHook(() => useFlowState());
    act(() => result.current.goToPreview());
    expect(result.current.step).toBe('preview');
  });

  it('goToMatching transitions to matching', () => {
    const { result } = renderHook(() => useFlowState());
    act(() => result.current.goToMatching());
    expect(result.current.step).toBe('matching');
  });

  it('goToExport stores matchRows and transitions to export', () => {
    const { result } = renderHook(() => useFlowState());
    act(() => result.current.goToExport(mockRows));
    expect(result.current.step).toBe('export');
    expect(result.current.matchRows).toEqual(mockRows);
  });

  it('goBackToPreview transitions back to preview', () => {
    const { result } = renderHook(() => useFlowState());
    act(() => result.current.goToMatching());
    act(() => result.current.goBackToPreview());
    expect(result.current.step).toBe('preview');
  });

  it('goBackToMatching transitions back to matching', () => {
    const { result } = renderHook(() => useFlowState());
    act(() => result.current.goToExport(mockRows));
    act(() => result.current.goBackToMatching());
    expect(result.current.step).toBe('matching');
  });
});
