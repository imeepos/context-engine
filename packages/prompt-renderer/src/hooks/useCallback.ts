import { getNextHook } from './runtime';

type DependencyList = ReadonlyArray<any>;

export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T {
  const hook = getNextHook();

  const hasChanged = !hook.value || deps.some((dep, i) => !Object.is(dep, hook.value.deps[i]));

  if (hasChanged) {
    hook.value = { callback, deps };
  }

  return hook.value.callback;
}
