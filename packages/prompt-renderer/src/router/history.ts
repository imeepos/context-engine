import { parseUrl } from './url';

export interface Location {
  pathname: string;
  query: Record<string, string | string[]>;
  hash?: string;
}

export type NavigationAction = 'PUSH' | 'REPLACE' | 'POP';

export interface NavigationUpdate {
  action: NavigationAction;
  location: Location;
}

export type Listener = (update: NavigationUpdate) => void;
export type UnlistenFn = () => void;

export interface NavigationHistory {
  location: Location;
  index: number;
  length: number;
  push(url: string): void;
  replace(url: string): void;
  back(): void;
  forward(): void;
  go(delta: number): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
  listen(listener: Listener): UnlistenFn;
}

export function createHistory(): NavigationHistory {
  const entries: Location[] = [];
  let currentIndex = -1;
  const listeners: Listener[] = [];

  function notify(action: NavigationAction, location: Location): void {
    listeners.forEach(listener => listener({ action, location }));
  }

  function urlToLocation(url: string): Location {
    const parsed = parseUrl(url);
    return {
      pathname: parsed.pathname,
      query: parsed.query,
      hash: parsed.hash
    };
  }

  return {
    get location(): Location {
      return entries[currentIndex] || { pathname: '/', query: {}, hash: undefined };
    },

    get index(): number {
      return currentIndex;
    },

    get length(): number {
      return entries.length;
    },

    push(url: string): void {
      const location = urlToLocation(url);
      entries.splice(currentIndex + 1);
      entries.push(location);
      currentIndex = entries.length - 1;
      notify('PUSH', location);
    },

    replace(url: string): void {
      const location = urlToLocation(url);
      if (currentIndex >= 0) {
        entries[currentIndex] = location;
      } else {
        entries.push(location);
        currentIndex = 0;
      }
      notify('REPLACE', location);
    },

    back(): void {
      if (this.canGoBack()) {
        currentIndex--;
        notify('POP', entries[currentIndex]);
      }
    },

    forward(): void {
      if (this.canGoForward()) {
        currentIndex++;
        notify('POP', entries[currentIndex]);
      }
    },

    go(delta: number): void {
      const newIndex = Math.max(0, Math.min(entries.length - 1, currentIndex + delta));
      if (newIndex !== currentIndex) {
        currentIndex = newIndex;
        notify('POP', entries[currentIndex]);
      }
    },

    canGoBack(): boolean {
      return currentIndex > 0;
    },

    canGoForward(): boolean {
      return currentIndex < entries.length - 1;
    },

    listen(listener: Listener): UnlistenFn {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    }
  };
}
