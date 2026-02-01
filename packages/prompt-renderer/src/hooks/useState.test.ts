import { describe, it, expect, beforeEach } from 'vitest';
import { useState } from './useState';
import { setCurrentFiber, resetCurrentFiber, getOrCreateFiberState, scheduler } from './runtime';

describe('useState', () => {
  let fiber: any;

  beforeEach(() => {
    fiber = { id: 'test-fiber' };
    getOrCreateFiberState(fiber, () => {}, {});
    setCurrentFiber(fiber);
  });

  it('should initialize state with value', () => {
    const [count] = useState(0);
    expect(count).toBe(0);
  });

  it('should initialize state with function', () => {
    const [count] = useState(() => 42);
    expect(count).toBe(42);
  });

  it('should update state with new value', () => {
    const [count, setCount] = useState(0);
    expect(count).toBe(0);

    setCount(1);
    resetCurrentFiber();
    setCurrentFiber(fiber);

    const [newCount] = useState(0);
    expect(newCount).toBe(1);
  });

  it('should update state with function', () => {
    const [count, setCount] = useState(5);
    expect(count).toBe(5);

    setCount(prev => prev + 10);
    resetCurrentFiber();
    setCurrentFiber(fiber);

    const [newCount] = useState(5);
    expect(newCount).toBe(15);
  });

  it('should not schedule update if value is the same', () => {
    const [, setCount] = useState(0);
    const pendingBefore = (scheduler as any).pending.size;

    setCount(0);
    const pendingAfter = (scheduler as any).pending.size;

    expect(pendingAfter).toBe(pendingBefore);
  });

  it('should schedule update when value changes', () => {
    const [, setCount] = useState(0);

    setCount(1);

    expect((scheduler as any).pending.has(fiber)).toBe(true);
  });

  it('should throw error when called outside component', () => {
    resetCurrentFiber();
    expect(() => useState(0)).toThrow('Hooks can only be called inside a component');
  });
});
