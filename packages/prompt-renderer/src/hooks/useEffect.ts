import { getNextHook } from './runtime';

type EffectCallback = () => void | (() => void);
type DependencyList = ReadonlyArray<any>;

export function useEffect(effect: EffectCallback, deps?: DependencyList): void {
  const hook = getNextHook();

  const hasChanged = !hook.value || !deps || deps.some((dep, i) => !Object.is(dep, hook.value.deps[i]));

  if (hasChanged) {
    if (hook.value?.cleanup) {
      hook.value.cleanup();
    }

    const cleanup = effect();
    hook.value = { deps, cleanup };
  }
}
