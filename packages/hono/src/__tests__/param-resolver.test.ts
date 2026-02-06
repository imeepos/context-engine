import { describe, expect, it } from 'vitest';
import { ParamType } from '@sker/core';
import { z } from 'zod';
import { resolveMethodParams } from '../param-resolver';

describe('param-resolver', () => {
  it('resolves param/query/body and validates by zod', () => {
    const params = resolveMethodParams(
      {
        'param:0': { index: 0, type: ParamType.PARAM, key: 'id' },
        'query:1': { index: 1, type: ParamType.QUERY },
        'body:2': { index: 2, type: ParamType.BODY, zod: z.object({ name: z.string().min(1) }) },
      },
      {
        params: { id: 'plugin-1' },
        query: { page: '1' },
        body: { name: 'demo' },
      }
    );

    expect(params).toEqual(['plugin-1', { page: '1' }, { name: 'demo' }]);
  });

  it('extracts body field when key is provided', () => {
    const params = resolveMethodParams(
      {
        'body:0': { index: 0, type: ParamType.BODY, key: 'slug', zod: z.string() },
      },
      {
        params: {},
        query: {},
        body: { slug: 'market-tool' },
      }
    );

    expect(params).toEqual(['market-tool']);
  });
});
