import { getNextHook } from './runtime';

export interface RefObject<T> {
  current: T;
}

export function useRef<T>(initialValue: T): RefObject<T> {
  const hook = getNextHook();

  if (hook.value === undefined) {
    hook.value = { current: initialValue };
  }

  return hook.value;
}
