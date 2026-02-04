import { describe, it, expect } from 'vitest';
import React from 'react';
import { directRenderAsync } from './direct-render-async';
import { ElementNode, TextNode } from './types';

describe('directRenderAsync - Primitives', () => {
  it('renders null as null', async () => {
    const result = await directRenderAsync(null);
    expect(result).toBeNull();
  });

  it('renders undefined as null', async () => {
    const result = await directRenderAsync(undefined);
    expect(result).toBeNull();
  });

  it('renders boolean as null', async () => {
    expect(await directRenderAsync(true)).toBeNull();
    expect(await directRenderAsync(false)).toBeNull();
  });

  it('renders string as text node', async () => {
    const result = await directRenderAsync('Hello') as TextNode;
    expect(result.type).toBe('TEXT');
    expect(result.content).toBe('Hello');
  });

  it('renders number as text node', async () => {
    const result = await directRenderAsync(42) as TextNode;
    expect(result.type).toBe('TEXT');
    expect(result.content).toBe('42');
  });
});

describe('directRenderAsync - Async Components', () => {
  it('renders async function component', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return React.createElement('div', null, 'Async Content');
    };
    const element = React.createElement(AsyncComponent);
    const result = await directRenderAsync(element) as ElementNode;
    expect(result.type).toBe('div');
    expect((result.children[0] as TextNode).content).toBe('Async Content');
  });

  it('renders async component with data fetching', async () => {
    const fetchData = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'Fetched Data';
    };

    const DataComponent = async () => {
      const data = await fetchData();
      return React.createElement('p', null, data);
    };

    const element = React.createElement(DataComponent);
    const result = await directRenderAsync(element) as ElementNode;
    expect(result.type).toBe('p');
    expect((result.children[0] as TextNode).content).toBe('Fetched Data');
  });

  it('renders nested async components', async () => {
    const InnerAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return React.createElement('span', null, 'Inner');
    };

    const OuterAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return React.createElement('div', null, React.createElement(InnerAsync));
    };

    const element = React.createElement(OuterAsync);
    const result = await directRenderAsync(element) as ElementNode;
    expect(result.type).toBe('div');
    const child = result.children[0] as ElementNode;
    expect(child.type).toBe('span');
    expect((child.children[0] as TextNode).content).toBe('Inner');
  });

  it('handles async component with injector', async () => {
    const mockInjector = {
      get: (token: any) => {
        if (token === 'DATABASE') {
          return {
            query: async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return [{ id: 1, name: 'User 1' }];
            }
          };
        }
      }
    };

    const UserList = async ({ injector }: any) => {
      const db = injector.get('DATABASE');
      const users = await db.query();
      return React.createElement('ul', null,
        users.map((u: any) => React.createElement('li', { key: u.id }, u.name))
      );
    };

    const element = React.createElement(UserList, { injector: mockInjector });
    const result = await directRenderAsync(element) as ElementNode;
    expect(result.type).toBe('ul');
    expect(result.children).toHaveLength(1);
    const li = result.children[0] as ElementNode;
    expect(li.type).toBe('li');
    expect((li.children[0] as TextNode).content).toBe('User 1');
  });
});

describe('directRenderAsync - Sync Components', () => {
  it('renders sync function component', async () => {
    const SyncComponent = () => React.createElement('div', null, 'Sync Content');
    const element = React.createElement(SyncComponent);
    const result = await directRenderAsync(element) as ElementNode;
    expect(result.type).toBe('div');
    expect((result.children[0] as TextNode).content).toBe('Sync Content');
  });

  it('renders mixed sync and async components', async () => {
    const SyncChild = () => React.createElement('span', null, 'Sync');
    const AsyncChild = async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return React.createElement('span', null, 'Async');
    };

    const Parent = () => React.createElement('div', null,
      React.createElement(SyncChild),
      React.createElement(AsyncChild)
    );

    const element = React.createElement(Parent);
    const result = await directRenderAsync(element) as ElementNode;
    expect(result.type).toBe('div');
    expect(result.children).toHaveLength(2);
    expect((result.children[0] as ElementNode).type).toBe('span');
    expect((result.children[1] as ElementNode).type).toBe('span');
  });
});

describe('directRenderAsync - Arrays', () => {
  it('renders array with async elements', async () => {
    const AsyncItem = async ({ text }: { text: string }) => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return React.createElement('li', null, text);
    };

    const items = [
      React.createElement(AsyncItem, { text: 'Item 1', key: '1' }),
      React.createElement(AsyncItem, { text: 'Item 2', key: '2' })
    ];

    const result = await directRenderAsync(items) as ElementNode;
    expect(result.type).toBe('fragment');
    expect(result.children).toHaveLength(2);
  });
});

describe('directRenderAsync - Edge Cases', () => {
  it('handles async component returning null', async () => {
    const EmptyAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return null;
    };
    const element = React.createElement(EmptyAsync);
    const result = await directRenderAsync(element);
    expect(result).toBeNull();
  });

  it('handles async component with error', async () => {
    const ErrorAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      throw new Error('Async error');
    };
    const element = React.createElement(ErrorAsync);
    await expect(directRenderAsync(element)).rejects.toThrow('Async error');
  });
});
