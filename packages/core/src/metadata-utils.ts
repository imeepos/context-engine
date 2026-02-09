/**
 * 元数据工具模块
 * 提供 TypeScript 装饰器元数据的提取、验证和缓存功能
 */

import { InjectionToken } from './injection-token';
import { InjectionTokenType } from './injector';

/**
 * 参数类型元数据键（TypeScript 自动生成）
 */
const DESIGN_PARAMTYPES = 'design:paramtypes';

/**
 * 返回类型元数据键（TypeScript 自动生成）
 */
const DESIGN_RETURNTYPE = 'design:returntype';

/**
 * 元数据缓存类
 * 缓存反射元数据查询结果，减少重复的 Reflect.getMetadata 调用
 */
class MetadataCache {
  private static cache = new Map<string, any>();

  /**
   * 获取缓存的元数据
   */
  static get<T>(target: any, key: string): T | undefined {
    const cacheKey = `${target.name || target.toString()}:${key}`;
    return this.cache.get(cacheKey);
  }

  /**
   * 设置缓存的元数据
   */
  static set<T>(target: any, key: string, value: T): void {
    const cacheKey = `${target.name || target.toString()}:${key}`;
    this.cache.set(cacheKey, value);
  }

  /**
   * 获取或计算元数据（带缓存）
   */
  static getOrCompute<T>(target: any, key: string, compute: () => T): T {
    const cached = this.get<T>(target, key);
    if (cached !== undefined) return cached;

    const value = compute();
    this.set(target, key, value);
    return value;
  }

  /**
   * 清除所有缓存（用于测试）
   */
  static clear(): void {
    this.cache.clear();
  }
}

/**
 * 从函数源代码中提取参数名称
 *
 * @param target 目标函数或类
 * @returns 参数名称数组
 */
export function extractParameterNames(target: Function): string[] {
  return MetadataCache.getOrCompute(target, 'paramNames', () => {
    const fnStr = target.toString();

    // 匹配构造函数或普通函数的参数列表
    const constructorMatch = fnStr.match(/constructor\s*\((.*?)\)/);
    const functionMatch = fnStr.match(/function\s*\w*\s*\((.*?)\)/);
    const arrowMatch = fnStr.match(/\((.*?)\)\s*=>/);

    const paramsStr =
      constructorMatch?.[1] || functionMatch?.[1] || arrowMatch?.[1];
    if (!paramsStr) return [];

    return paramsStr
      .split(',')
      .map((param) => {
        // 移除类型注解和默认值
        const name = param.trim().split(/[:=]/)[0]?.trim() || '';
        // 移除装饰器（如 @Inject）
        return name.replace(/^@\w+\s*\(.*?\)\s*/, '');
      })
      .filter(Boolean);
  });
}

/**
 * 检查注入令牌与参数类型是否兼容
 *
 * @param token 注入令牌
 * @param paramType 参数类型（从 design:paramtypes 获取）
 * @returns 是否兼容
 */
export function isTypeCompatible(
  token: any,
  paramType: Function | undefined,
): boolean {
  // 如果没有参数类型信息，无法验证
  if (!paramType) {
    return true;
  }

  // 如果 token 是类，直接比较
  if (typeof token === 'function') {
    // 完全相同
    if (token === paramType) {
      return true;
    }
    // 检查是否是子类
    try {
      return paramType.prototype instanceof token;
    } catch {
      return false;
    }
  }

  // 如果 token 是 InjectionToken，无法验证（返回 true）
  if (token instanceof InjectionToken) {
    return true;
  }

  // 如果 token 是字符串或其他类型，无法验证
  return true;
}

/**
 * 获取类型的友好名称
 *
 * @param type 类型（类或函数）
 * @returns 类型名称
 */
export function getTypeName(type: Function | undefined): string {
  if (!type) {
    return 'unknown';
  }

  if (type.name) {
    return type.name;
  }

  return type.toString();
}

/**
 * 获取注入令牌的友好名称
 *
 * @param token 注入令牌
 * @returns 令牌名称
 */
export function getTokenName(token: any): string {
  if (!token) {
    return 'undefined';
  }

  // 类
  if (typeof token === 'function' && token.name) {
    return token.name;
  }

  // InjectionToken
  if (token instanceof InjectionToken) {
    return token.toString();
  }

  // 字符串令牌
  if (typeof token === 'string') {
    return `"${token}"`;
  }

  // Symbol 令牌
  if (typeof token === 'symbol') {
    return token.toString();
  }

  return String(token);
}

/**
 * 获取参数类型元数据
 *
 * @param target 目标类
 * @returns 参数类型数组
 */
export function getParameterTypes(target: Function): Function[] | undefined {
  return MetadataCache.getOrCompute(target, DESIGN_PARAMTYPES, () => {
    return Reflect.getMetadata(DESIGN_PARAMTYPES, target);
  });
}

/**
 * 获取返回类型元数据
 *
 * @param target 目标类或方法
 * @param propertyKey 方法名（可选）
 * @returns 返回类型
 */
export function getReturnType(
  target: any,
  propertyKey?: string | symbol,
): Function | undefined {
  const cacheKey = propertyKey
    ? `${DESIGN_RETURNTYPE}:${String(propertyKey)}`
    : DESIGN_RETURNTYPE;

  return MetadataCache.getOrCompute(target, cacheKey, () => {
    if (propertyKey) {
      return Reflect.getMetadata(DESIGN_RETURNTYPE, target, propertyKey);
    }
    return Reflect.getMetadata(DESIGN_RETURNTYPE, target);
  });
}

/**
 * 验证注入令牌与参数类型的兼容性（开发模式）
 *
 * @param target 目标类
 * @param tokens 注入令牌数组
 * @param paramTypes 参数类型数组
 * @returns 验证结果数组
 */
export function validateTokenTypes(
  target: Function,
  tokens: InjectionTokenType<unknown>[],
  paramTypes: Function[] | undefined,
): Array<{ index: number; paramName: string; compatible: boolean; warning: string }> {
  // 仅在开发模式下验证
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.NODE_ENV === 'production') {
    return [];
  }

  if (!paramTypes || paramTypes.length === 0) {
    return [];
  }

  const paramNames = extractParameterNames(target);
  const warnings: Array<{
    index: number;
    paramName: string;
    compatible: boolean;
    warning: string;
  }> = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const paramType = paramTypes[i];
    const paramName = paramNames[i] || `parameter ${i}`;

    if (!isTypeCompatible(token, paramType)) {
      warnings.push({
        index: i,
        paramName,
        compatible: false,
        warning: `Type mismatch for ${paramName}: expected ${getTypeName(paramType)}, but got ${getTokenName(token)}`,
      });
    }
  }

  return warnings;
}

/**
 * 导出元数据缓存（用于测试）
 */
export { MetadataCache };
