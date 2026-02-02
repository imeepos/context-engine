type Listener<T> = (state: T) => void;

export class ReactiveState<T> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceMs: number;

  constructor(initialState: T, debounceMs: number = 150) {
    this.state = initialState;
    this.debounceMs = debounceMs;
  }

  getState(): T {
    return this.state;
  }

  setState(newState: T | ((prev: T) => T)): void {
    const nextState = typeof newState === 'function'
      ? (newState as (prev: T) => T)(this.state)
      : newState;

    if (this.shallowEqual(this.state, nextState)) {
      return;
    }

    this.state = nextState;
    this.notifyListeners();
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.listeners.forEach(listener => listener(this.state));
      this.debounceTimer = null;
    }, this.debounceMs);
  }

  private shallowEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (a === null || b === null) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }

    return true;
  }
}
