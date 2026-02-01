import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEffect } from './useEffect';
import { setCurrentFiber, resetCurrentFiber, getOrCreateFiberState } from './runtime';

describe('useEffect', () => {
  let fiber: any;

  beforeEach(() => {
    fiber = { id: 'test-fiber' };
    getOrCreateFiberState(fiber, () => {}, {});
    setCurrentFiber(fiber);
  });

  it('should run effect on first render', () => {
    const effect = vi.fn();
    useEffect(effect, []);
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('should not run effect if deps unchanged', () => {
    const effect = vi.fn();
    useEffect(effect, [1, 2]);

    resetCurrentFiber();
    setCurrentFiber(fiber);
    useEffect(effect, [1, 2]);

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('should run effect if deps changed', () => {
    const effect = vi.fn();
    useEffect(effect, [1]);

    resetCurrentFiber();
    setCurrentFiber(fiber);
    useEffect(effect, [2]);

    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('should run cleanup before next effect', () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    useEffect(effect, [1]);

    resetCurrentFiber();
    setCurrentFiber(fiber);
    useEffect(effect, [2]);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('should always run effect when no deps provided', () => {
    const effect = vi.fn();
    useEffect(effect);

    resetCurrentFiber();
    setCurrentFiber(fiber);
    useEffect(effect);

    expect(effect).toHaveBeenCalledTimes(2);
  });
});
