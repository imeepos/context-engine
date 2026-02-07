interface HookState {
  value: any;
  queue: Array<any>;
}

interface FiberState {
  hooks: HookState[];
  hookIndex: number;
  component: any;
  props: any;
}

const fiberStateMap = new WeakMap<any, FiberState>();
let currentFiber: any = null;
let currentHookIndex = 0;

export class UpdateScheduler {
  private pending = new Set<any>();
  private listeners = new Map<any, Set<() => void>>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  schedule(fiber: any): void {
    this.pending.add(fiber);
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, 0);
    }
  }

  private flush(): void {
    this.timer = null;
    const fibers = [...this.pending];
    this.pending.clear();
    for (const fiber of fibers) {
      const listeners = this.listeners.get(fiber);
      if (listeners) {
        listeners.forEach(callback => callback());
      }
    }
  }

  subscribe(fiber: any, callback: () => void): () => void {
    if (!this.listeners.has(fiber)) {
      this.listeners.set(fiber, new Set());
    }
    this.listeners.get(fiber)!.add(callback);

    return () => {
      const listeners = this.listeners.get(fiber);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(fiber);
        }
      }
    };
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
  }
}

export const scheduler = new UpdateScheduler();

export function setCurrentFiber(fiber: any): void {
  currentFiber = fiber;
  currentHookIndex = 0;
}

export function resetCurrentFiber(): void {
  currentFiber = null;
  currentHookIndex = 0;
}

export function getCurrentFiber(): any {
  if (!currentFiber) {
    throw new Error('Hooks can only be called inside a component');
  }
  return currentFiber;
}

export function getOrCreateFiberState(fiber: any, component: any, props: any): FiberState {
  let state = fiberStateMap.get(fiber);
  if (!state) {
    state = {
      hooks: [],
      hookIndex: 0,
      component,
      props
    };
    fiberStateMap.set(fiber, state);
  }
  return state;
}

export function getNextHook(): HookState {
  const fiber = getCurrentFiber();
  const state = fiberStateMap.get(fiber);
  if (!state) {
    throw new Error('Fiber state not initialized');
  }

  const index = currentHookIndex++;
  if (!state.hooks[index]) {
    state.hooks[index] = {
      value: undefined,
      queue: []
    };
  }

  return state.hooks[index];
}
