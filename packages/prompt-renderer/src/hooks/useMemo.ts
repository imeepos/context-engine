import { getNextHook } from './runtime';

type DependencyList = ReadonlyArray<any>;

export function useMemo<T>(factory: () => T, deps: DependencyList): T {
  const hook = getNextHook();

  const hasChanged = !hook.value || deps.some((dep, i) => !Object.is(dep, hook.value.deps[i]));

  if (hasChanged) {
    hook.value = { value: factory(), deps };
  }

  return hook.value.value;
}
