import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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
  private updateSubject = new Subject<any>();
  private listeners = new Map<any, Set<() => void>>();
  private subscription: any;

  constructor() {
    this.subscription = this.updateSubject
      .pipe(debounceTime(0))
      .subscribe((fiber) => {
        const listeners = this.listeners.get(fiber);
        if (listeners) {
          listeners.forEach(callback => callback());
        }
      });
  }

  schedule(fiber: any): void {
    this.updateSubject.next(fiber);
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
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
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
