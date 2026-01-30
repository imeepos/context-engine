export interface Match {
  matched: boolean;
  params?: Record<string, string>;
  wildcard?: string;
}

export function matchRoute(pattern: string, pathname: string): Match {
  const normalizedPattern = pattern.replace(/\/$/, '') || '/';
  const normalizedPathname = pathname.replace(/\/$/, '') || '/';

  if (normalizedPattern === normalizedPathname) {
    return { matched: true, params: {} };
  }

  if (pattern.includes('*')) {
    const prefix = pattern.slice(0, pattern.indexOf('*'));
    const normalizedPrefix = prefix.replace(/\/$/, '');

    if (normalizedPathname.startsWith(normalizedPrefix)) {
      const wildcard = normalizedPathname.slice(normalizedPrefix.length + 1);
      return { matched: true, wildcard, params: {} };
    }
    return { matched: false };
  }

  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const pathSegments = normalizedPathname.split('/').filter(Boolean);

  const hasOptional = patternSegments.some(s => s.endsWith('?'));

  if (hasOptional) {
    const requiredSegments = patternSegments.filter(s => !s.endsWith('?'));
    const optionalSegments = patternSegments.filter(s => s.endsWith('?'));

    if (pathSegments.length < requiredSegments.length ||
        pathSegments.length > patternSegments.length) {
      return { matched: false };
    }
  } else if (patternSegments.length !== pathSegments.length) {
    return { matched: false };
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];

    if (patternSegment.endsWith('?')) {
      const paramName = patternSegment.slice(1, -1);
      if (pathSegment) {
        params[paramName] = pathSegment;
      }
    } else if (patternSegment.startsWith(':')) {
      const paramName = patternSegment.slice(1);
      params[paramName] = pathSegment;
    } else if (patternSegment !== pathSegment) {
      return { matched: false };
    }
  }

  return { matched: true, params };
}

export function compilePattern(pattern: string): RegExp {
  let regexPattern = pattern
    .replace(/\//g, '\\/')
    .replace(/:\w+/g, '([^/]+)')
    .replace(/\*/g, '.*');

  return new RegExp(`^${regexPattern}$`);
}

export function rankRoutes(routes: string[]): string[] {
  return [...routes].sort((a, b) => {
    const aSegments = a.split('/').filter(Boolean);
    const bSegments = b.split('/').filter(Boolean);

    if (aSegments.length !== bSegments.length) {
      return bSegments.length - aSegments.length;
    }

    for (let i = 0; i < aSegments.length; i++) {
      const aSegment = aSegments[i];
      const bSegment = bSegments[i];

      const aIsStatic = !aSegment.startsWith(':') && aSegment !== '*';
      const bIsStatic = !bSegment.startsWith(':') && bSegment !== '*';

      if (aIsStatic && !bIsStatic) return -1;
      if (!aIsStatic && bIsStatic) return 1;

      const aIsDynamic = aSegment.startsWith(':');
      const bIsDynamic = bSegment.startsWith(':');

      if (aIsDynamic && bSegment === '*') return -1;
      if (aSegment === '*' && bIsDynamic) return 1;
    }

    return 0;
  });
}
