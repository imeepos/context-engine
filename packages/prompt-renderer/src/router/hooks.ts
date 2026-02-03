import { createContext, useContext, useState, useEffect } from 'react';
import { type NavigationHistory, type Location } from './history';
import { buildUrl } from './url';

interface RouterContextValue {
  history: NavigationHistory;
  params: Record<string, string>;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

function useRouterContext(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context;
}

export function useRouter() {
  const { history } = useRouterContext();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return history.listen(() => forceUpdate({}));
  }, [history]);

  return {
    navigate: (url: string) => history.push(url),
    back: () => history.back(),
    forward: () => history.forward(),
    replace: (url: string) => history.replace(url),
    location: history.location,
    canGoBack: () => history.canGoBack(),
    canGoForward: () => history.canGoForward()
  };
}

export function useParams(): Record<string, string> {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useParams must be used within RouterProvider');
  }
  return context.params;
}

export function useLocation(): Location {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useLocation must be used within RouterProvider');
  }

  const { history } = context;
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return history.listen(() => forceUpdate({}));
  }, [history]);

  return history.location;
}

export function useNavigate() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigate must be used within RouterProvider');
  }

  const { history } = context;

  return (to: string, options?: { replace?: boolean }) => {
    let targetPath = to;

    if (to.startsWith('../')) {
      const currentSegments = history.location.pathname.split('/').filter(Boolean);
      const upCount = to.split('/').filter(s => s === '..').length;
      const relativeSegments = to.split('/').filter(s => s !== '..' && s !== '');
      const newSegments = currentSegments.slice(0, currentSegments.length - upCount).concat(relativeSegments);
      targetPath = '/' + newSegments.join('/');
    }

    if (options?.replace) {
      history.replace(targetPath);
    } else {
      history.push(targetPath);
    }
  };
}

export function useSearchParams(): [Record<string, string | string[]>, (params: Record<string, string | string[]>) => void] {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useSearchParams must be used within RouterProvider');
  }

  const { history } = context;
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return history.listen(() => forceUpdate({}));
  }, [history]);

  const setSearchParams = (newParams: Record<string, string | string[]>) => {
    const mergedParams = { ...history.location.query, ...newParams };
    const url = buildUrl({
      pathname: history.location.pathname,
      query: mergedParams,
      hash: history.location.hash
    });
    history.replace(url);
  };

  return [history.location.query, setSearchParams];
}
