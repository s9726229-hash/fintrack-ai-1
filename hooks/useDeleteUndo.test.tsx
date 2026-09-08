import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDeleteUndo } from './useDeleteUndo';

describe('delete undo', () => {
  it('restores in reverse order and clears entries when replacement starts', () => {
    const calls: string[] = [];
    const { result, rerender } = renderHook(({ enabled }) => useDeleteUndo(enabled), { initialProps: { enabled: true } });
    act(() => { result.current.register('A', () => calls.push('A')); result.current.register('B', () => calls.push('B')); });
    act(() => result.current.undo());
    expect(calls).toEqual(['B']);
    expect(result.current.label).toBe('A');
    rerender({ enabled: false });
    rerender({ enabled: true });
    act(() => result.current.undo());
    expect(calls).toEqual(['B']);
  });
  it('retains a failed restore for retry and caps history at ten', () => {
    const { result } = renderHook(() => useDeleteUndo(true));
    const restore = vi.fn().mockImplementationOnce(() => { throw new Error('quota'); });
    act(() => result.current.register('retry', restore));
    expect(() => act(() => result.current.undo())).toThrow('quota');
    expect(result.current.label).toBe('retry');
    act(() => result.current.undo());
    expect(result.current.label).toBe('');
    const calls: number[] = [];
    act(() => { for (let i = 0; i < 12; i++) result.current.register(String(i), () => calls.push(i)); });
    act(() => { for (let i = 0; i < 12; i++) result.current.undo(); });
    expect(calls).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  });
});
