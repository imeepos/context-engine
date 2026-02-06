import { describe, expect, it } from 'vitest';
import { compareRoutePriority, sortRoutesByPriority } from '../route-sorter';

describe('route-sorter', () => {
  it('prioritizes static route over dynamic route', () => {
    expect(compareRoutePriority('/plugins/status', '/plugins/:id')).toBeLessThan(0);
  });

  it('prioritizes longer static route over shorter static route', () => {
    expect(compareRoutePriority('/plugins/installed', '/plugins')).toBeLessThan(0);
  });

  it('sorts routes with same strategy used by registrar', () => {
    const sorted = sortRoutesByPriority([
      { fullPath: '/plugins/:id' },
      { fullPath: '/plugins/status' },
      { fullPath: '/plugins' },
    ]);

    expect(sorted.map((item) => item.fullPath)).toEqual([
      '/plugins/status',
      '/plugins',
      '/plugins/:id',
    ]);
  });
});
