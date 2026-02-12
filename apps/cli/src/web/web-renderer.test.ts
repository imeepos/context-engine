import { describe, it, expect, vi } from 'vitest';
import { WebRenderer } from './web-renderer';

describe('WebRenderer', () => {
  it('creates instance with UIRenderer', () => {
    const mockUiRenderer = createMockUIRenderer();
    const wr = new WebRenderer(mockUiRenderer);
    expect(wr).toBeDefined();
  });

  it('renders current page as HTML', async () => {
    const mockUiRenderer = createMockUIRenderer();
    const wr = new WebRenderer(mockUiRenderer);
    const html = await wr.renderPage('/');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Dashboard');
  });

  it('navigates and renders', async () => {
    const mockUiRenderer = createMockUIRenderer();
    const wr = new WebRenderer(mockUiRenderer);
    await wr.renderPage('/tasks');
    expect(mockUiRenderer.navigate)
      .toHaveBeenCalledWith(
        'prompt:///tasks',
        expect.anything()
      );
  });
});

function createMockUIRenderer() {
  const mockVNode = {
    type: 'div',
    props: {},
    children: [
      {
        type: 'h1',
        props: {},
        children: [
          { type: 'TEXT', content: 'Dashboard' },
        ],
      },
    ],
  };
  return {
    navigate: vi.fn().mockResolvedValue({
      prompt: '# Dashboard',
      tools: [],
      vnode: mockVNode,
    }),
    render: vi.fn().mockResolvedValue({
      prompt: '# Dashboard',
      tools: [],
      vnode: mockVNode,
    }),
    getRenderResult: vi.fn().mockReturnValue({
      prompt: '# Dashboard',
      tools: [],
      vnode: mockVNode,
    }),
    currentUrl: 'prompt:///',
    providers: [],
  };
}
