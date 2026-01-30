export interface PromptURL {
  pathname: string;
  query: Record<string, string | string[]>;
  hash?: string;
  href: string;
}

export function parseUrl(url: string): PromptURL {
  if (!url || url.trim() === '') {
    throw new Error('Invalid URL: empty string');
  }

  if (!url.startsWith('/')) {
    throw new Error('Invalid URL format: must start with /');
  }

  const hashIndex = url.indexOf('#');
  const hash = hashIndex !== -1 ? url.slice(hashIndex) : undefined;
  const urlWithoutHash = hashIndex !== -1 ? url.slice(0, hashIndex) : url;

  const queryIndex = urlWithoutHash.indexOf('?');
  const pathname = queryIndex !== -1
    ? decodeURIComponent(urlWithoutHash.slice(0, queryIndex))
    : decodeURIComponent(urlWithoutHash);

  const query: Record<string, string | string[]> = {};

  if (queryIndex !== -1) {
    const queryString = urlWithoutHash.slice(queryIndex + 1);
    if (queryString) {
      const params = new URLSearchParams(queryString);
      const seen = new Set<string>();

      params.forEach((_, key) => {
        if (!seen.has(key)) {
          seen.add(key);
          const values = params.getAll(key);
          query[key] = values.length > 1 ? values : values[0];
        }
      });
    }
  }

  return {
    pathname,
    query,
    hash,
    href: url
  };
}

export function buildUrl(components: {
  pathname: string;
  query?: Record<string, string | string[]>;
  hash?: string;
}): string {
  let url = components.pathname;

  if (components.query && Object.keys(components.query).length > 0) {
    const params = new URLSearchParams();
    Object.entries(components.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.append(key, value);
      }
    });
    url += '?' + params.toString().replace(/\+/g, '%20');
  }

  if (components.hash) {
    url += components.hash;
  }

  return url;
}

export function extractParams(pattern: string, pathname: string): Record<string, string> | null {
  const normalizedPattern = pattern.replace(/\/$/, '');
  const normalizedPathname = pathname.replace(/\/$/, '');

  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const pathSegments = normalizedPathname.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];

    if (patternSegment.startsWith(':')) {
      const paramName = patternSegment.slice(1);
      params[paramName] = pathSegment;
    } else if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}
