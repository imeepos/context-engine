import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHistory, type NavigationHistory } from './history';

describe('Navigation History', () => {
  let history: NavigationHistory;

  beforeEach(() => {
    history = createHistory();
  });

  describe('push', () => {
    it('adds new entry to history', () => {
      history.push('/products');
      expect(history.location.pathname).toBe('/products');
    });

    it('increments history index', () => {
      history.push('/products');
      history.push('/users');
      expect(history.index).toBe(1);
      expect(history.length).toBe(2);
    });

    it('clears forward history when pushing from middle', () => {
      history.push('/products');
      history.push('/users');
      history.push('/settings');
      history.back();
      history.back();
      history.push('/new-path');
      expect(history.length).toBe(2);
      expect(history.canGoForward()).toBe(false);
    });

    it('notifies listeners on push', () => {
      const listener = vi.fn();
      history.listen(listener);
      history.push('/products');
      expect(listener).toHaveBeenCalledWith({
        action: 'PUSH',
        location: expect.objectContaining({ pathname: '/products' })
      });
    });

    it('handles push with query parameters', () => {
      history.push('/products?color=red');
      expect(history.location.pathname).toBe('/products');
      expect(history.location.query).toEqual({ color: 'red' });
    });
  });

  describe('replace', () => {
    it('replaces current entry without changing index', () => {
      history.push('/products');
      const initialIndex = history.index;
      history.replace('/users');
      expect(history.index).toBe(initialIndex);
      expect(history.location.pathname).toBe('/users');
    });

    it('does not increase history length', () => {
      history.push('/products');
      const initialLength = history.length;
      history.replace('/users');
      expect(history.length).toBe(initialLength);
    });

    it('notifies listeners on replace', () => {
      const listener = vi.fn();
      history.push('/products');
      history.listen(listener);
      history.replace('/users');
      expect(listener).toHaveBeenCalledWith({
        action: 'REPLACE',
        location: expect.objectContaining({ pathname: '/users' })
      });
    });
  });

  describe('back', () => {
    it('navigates to previous entry', () => {
      history.push('/products');
      history.push('/users');
      history.back();
      expect(history.location.pathname).toBe('/products');
    });

    it('decrements history index', () => {
      history.push('/products');
      history.push('/users');
      history.back();
      expect(history.index).toBe(0);
    });

    it('does nothing when at beginning', () => {
      history.push('/products');
      history.back();
      expect(history.location.pathname).toBe('/products');
      expect(history.index).toBe(0);
    });

    it('notifies listeners on back', () => {
      const listener = vi.fn();
      history.push('/products');
      history.push('/users');
      history.listen(listener);
      history.back();
      expect(listener).toHaveBeenCalledWith({
        action: 'POP',
        location: expect.objectContaining({ pathname: '/products' })
      });
    });
  });

  describe('forward', () => {
    it('navigates to next entry', () => {
      history.push('/products');
      history.push('/users');
      history.back();
      history.forward();
      expect(history.location.pathname).toBe('/users');
    });

    it('increments history index', () => {
      history.push('/products');
      history.push('/users');
      history.back();
      history.forward();
      expect(history.index).toBe(1);
    });

    it('does nothing when at end', () => {
      history.push('/products');
      history.forward();
      expect(history.location.pathname).toBe('/products');
    });

    it('notifies listeners on forward', () => {
      const listener = vi.fn();
      history.push('/products');
      history.push('/users');
      history.back();
      history.listen(listener);
      history.forward();
      expect(listener).toHaveBeenCalledWith({
        action: 'POP',
        location: expect.objectContaining({ pathname: '/users' })
      });
    });
  });

  describe('go', () => {
    it('navigates forward by positive delta', () => {
      history.push('/a');
      history.push('/b');
      history.push('/c');
      history.back();
      history.back();
      history.go(2);
      expect(history.location.pathname).toBe('/c');
    });

    it('navigates backward by negative delta', () => {
      history.push('/a');
      history.push('/b');
      history.push('/c');
      history.go(-2);
      expect(history.location.pathname).toBe('/a');
    });

    it('clamps to valid range', () => {
      history.push('/a');
      history.push('/b');
      history.go(-10);
      expect(history.location.pathname).toBe('/a');
      history.go(10);
      expect(history.location.pathname).toBe('/b');
    });
  });

  describe('canGoBack', () => {
    it('returns false at beginning', () => {
      history.push('/products');
      expect(history.canGoBack()).toBe(false);
    });

    it('returns true when not at beginning', () => {
      history.push('/products');
      history.push('/users');
      expect(history.canGoBack()).toBe(true);
    });
  });

  describe('canGoForward', () => {
    it('returns false at end', () => {
      history.push('/products');
      expect(history.canGoForward()).toBe(false);
    });

    it('returns true when not at end', () => {
      history.push('/products');
      history.push('/users');
      history.back();
      expect(history.canGoForward()).toBe(true);
    });
  });

  describe('listen', () => {
    it('returns unlisten function', () => {
      const listener = vi.fn();
      const unlisten = history.listen(listener);
      expect(typeof unlisten).toBe('function');
    });

    it('stops calling listener after unlisten', () => {
      const listener = vi.fn();
      const unlisten = history.listen(listener);
      history.push('/products');
      unlisten();
      history.push('/users');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('supports multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      history.listen(listener1);
      history.listen(listener2);
      history.push('/products');
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });
});
