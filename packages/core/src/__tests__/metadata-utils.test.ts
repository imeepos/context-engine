import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractParameterNames,
  isTypeCompatible,
  getTypeName,
  getTokenName,
  getParameterTypes,
  MetadataCache,
} from '../metadata-utils';
import { InjectionToken } from '../injection-token';

describe('metadata-utils', () => {
  beforeEach(() => {
    MetadataCache.clear();
  });

  describe('extractParameterNames', () => {
    it('应该从构造函数中提取参数名称', () => {
      class TestClass {
        constructor(_param1: string, _param2: number) {}
      }

      const names = extractParameterNames(TestClass);
      expect(names).toEqual(['_param1', '_param2']);
    });

    it('应该从普通函数中提取参数名称', () => {
      function testFunction(_arg1: string, _arg2: number) {}

      const names = extractParameterNames(testFunction);
      expect(names).toEqual(['_arg1', '_arg2']);
    });

    it('应该从箭头函数中提取参数名称', () => {
      const arrowFn = (x: number, y: number) => x + y;

      const names = extractParameterNames(arrowFn);
      expect(names).toEqual(['x', 'y']);
    });

    it('应该处理没有参数的函数', () => {
      class NoParams {
        constructor() {}
      }

      const names = extractParameterNames(NoParams);
      expect(names).toEqual([]);
    });

    it('应该缓存结果', () => {
      class TestClass {
        constructor(_param1: string) {}
      }

      const names1 = extractParameterNames(TestClass);
      const names2 = extractParameterNames(TestClass);

      expect(names1).toBe(names2); // 应该是同一个引用
    });
  });

  describe('isTypeCompatible', () => {
    it('应该识别相同的类', () => {
      class TestClass {}

      expect(isTypeCompatible(TestClass, TestClass)).toBe(true);
    });

    it('应该识别子类', () => {
      class Parent {}
      class Child extends Parent {}

      expect(isTypeCompatible(Parent, Child)).toBe(true);
    });

    it('应该对 InjectionToken 返回 true', () => {
      const token = new InjectionToken<string>('test');
      class TestClass {}

      expect(isTypeCompatible(token, TestClass)).toBe(true);
    });

    it('应该对字符串令牌返回 true', () => {
      class TestClass {}

      expect(isTypeCompatible('STRING_TOKEN', TestClass)).toBe(true);
    });

    it('应该对没有参数类型返回 true', () => {
      class TestClass {}

      expect(isTypeCompatible(TestClass, undefined)).toBe(true);
    });
  });

  describe('getTypeName', () => {
    it('应该返回类名', () => {
      class TestClass {}

      expect(getTypeName(TestClass)).toBe('TestClass');
    });

    it('应该处理 undefined', () => {
      expect(getTypeName(undefined)).toBe('unknown');
    });
  });

  describe('getTokenName', () => {
    it('应该返回类名', () => {
      class TestClass {}

      expect(getTokenName(TestClass)).toBe('TestClass');
    });

    it('应该返回 InjectionToken 的字符串表示', () => {
      const token = new InjectionToken<string>('test-token');

      const name = getTokenName(token);
      expect(name).toContain('test-token');
    });

    it('应该处理字符串令牌', () => {
      expect(getTokenName('STRING_TOKEN')).toBe('"STRING_TOKEN"');
    });

    it('应该处理 undefined', () => {
      expect(getTokenName(undefined)).toBe('undefined');
    });
  });

  describe('getParameterTypes', () => {
    it('应该获取构造函数参数类型', () => {
      class Dependency {}

      class TestClass {
        constructor(_dep: Dependency) {}
      }

      // 手动设置元数据（模拟 TypeScript 的 emitDecoratorMetadata）
      Reflect.defineMetadata('design:paramtypes', [Dependency], TestClass);

      const types = getParameterTypes(TestClass);
      expect(types).toBeDefined();
      expect(types?.[0]).toBe(Dependency);
    });

    it('应该缓存参数类型', () => {
      class TestClass {
        constructor(_dep: string) {}
      }

      // 手动设置元数据
      Reflect.defineMetadata('design:paramtypes', [String], TestClass);

      const types1 = getParameterTypes(TestClass);
      const types2 = getParameterTypes(TestClass);

      expect(types1).toBe(types2);
    });
  });
});