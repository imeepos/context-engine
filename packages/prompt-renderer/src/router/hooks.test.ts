import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { useRouter, useParams, useLocation, useNavigate, useSearchParams, RouterContext } from './hooks';
import { createHistory, type NavigationHistory } from './history';

// 使用导出的 RouterContext 创建测试 Provider
function TestRouterProvider({
  children,
  history,
  params = {}
}: {
  children: ReactNode;
  history: NavigationHistory;
  params?: Record<string, string>;
}) {
  return createElement(RouterContext.Provider, { value: { history, params } }, children);
}

describe('Router Hooks Integration Tests', () => {
  let history: NavigationHistory;

  beforeEach(() => {
    history = createHistory();
    history.push('/');
  });

  describe('useRouter', () => {
    it('should throw error when used outside RouterProvider', () => {
      expect(() => {
        renderHook(() => useRouter());
      }).toThrow('useRouter must be used within RouterProvider');
    });

    it('should return router object with all methods', () => {
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useRouter(), { wrapper });

      expect(result.current).toHaveProperty('navigate');
      expect(result.current).toHaveProperty('back');
      expect(result.current).toHaveProperty('forward');
      expect(result.current).toHaveProperty('replace');
      expect(result.current).toHaveProperty('location');
      expect(result.current).toHaveProperty('canGoBack');
      expect(result.current).toHaveProperty('canGoForward');
    });

    it('should navigate to new URL', () => {
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useRouter(), { wrapper });

      act(() => {
        result.current.navigate('/products');
      });

      expect(result.current.location.pathname).toBe('/products');
    });

    it('should go back in history', () => {
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useRouter(), { wrapper });

      act(() => {
        result.current.navigate('/page1');
        result.current.navigate('/page2');
        result.current.back();
      });

      expect(result.current.location.pathname).toBe('/page1');
    });
  });

  describe('useParams', () => {
    it('should throw error when used outside RouterProvider', () => {
      expect(() => {
        renderHook(() => useParams());
      }).toThrow('useParams must be used within RouterProvider');
    });

    it('should return route params', () => {
      const params = { id: '123', slug: 'test-product' };
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, params, children });

      const { result } = renderHook(() => useParams(), { wrapper });

      expect(result.current).toEqual(params);
    });
  });

  describe('useLocation', () => {
    it('should throw error when used outside RouterProvider', () => {
      expect(() => {
        renderHook(() => useLocation());
      }).toThrow('useLocation must be used within RouterProvider');
    });

    it('should return current location', () => {
      history.push('/products?color=red');

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useLocation(), { wrapper });

      expect(result.current.pathname).toBe('/products');
      expect(result.current.query).toEqual({ color: 'red' });
    });

    it('should update when location changes', () => {
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        history.push('/users');
      });

      expect(result.current.pathname).toBe('/users');
    });
  });

  describe('useNavigate', () => {
    it('should throw error when used outside RouterProvider', () => {
      expect(() => {
        renderHook(() => useNavigate());
      }).toThrow('useNavigate must be used within RouterProvider');
    });

    it('should navigate to absolute path', () => {
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useNavigate(), { wrapper });

      act(() => {
        result.current('/products');
      });

      expect(history.location.pathname).toBe('/products');
    });

    it('should navigate with replace option', () => {
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useNavigate(), { wrapper });

      act(() => {
        history.push('/page1');
        history.push('/page2');
        const initialLength = history.length;
        result.current('/page3', { replace: true });
        expect(history.length).toBe(initialLength);
      });
    });

    it('should handle relative paths with ../', () => {
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useNavigate(), { wrapper });

      act(() => {
        history.push('/products/123/details');
        result.current('../456');
      });

      expect(history.location.pathname).toBe('/products/123/456');
    });
  });

  describe('useSearchParams', () => {
    it('should throw error when used outside RouterProvider', () => {
      expect(() => {
        renderHook(() => useSearchParams());
      }).toThrow('useSearchParams must be used within RouterProvider');
    });

    it('should return current search params', () => {
      history.push('/products?color=red&size=large');

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useSearchParams(), { wrapper });

      expect(result.current[0]).toEqual({ color: 'red', size: 'large' });
    });

    it('should update search params', () => {
      history.push('/products');

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useSearchParams(), { wrapper });

      act(() => {
        result.current[1]({ color: 'blue' });
      });

      expect(result.current[0]).toEqual({ color: 'blue' });
    });

    it('should merge with existing params', () => {
      history.push('/products?color=red');

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestRouterProvider, { history, children });

      const { result } = renderHook(() => useSearchParams(), { wrapper });

      act(() => {
        result.current[1]({ size: 'large' });
      });

      expect(result.current[0]).toEqual({ color: 'red', size: 'large' });
    });
  });
});
