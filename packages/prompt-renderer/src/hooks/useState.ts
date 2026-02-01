import { getNextHook, getCurrentFiber, scheduler } from './runtime';

export function useState<T>(initialValue: T | (() => T)): [T, (newValue: T | ((prev: T) => T)) => void] {
  const hook = getNextHook();
  const fiber = getCurrentFiber();

  if (hook.value === undefined) {
    hook.value = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  }

  const setState = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(hook.value) : newValue;

    if (Object.is(nextValue, hook.value)) {
      return;
    }

    hook.value = nextValue;
    scheduler.schedule(fiber);
  };

  return [hook.value, setState];
}
