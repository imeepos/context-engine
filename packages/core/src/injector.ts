import { InjectionToken } from './injection-token';
import { ForwardRef } from './forward-ref';
import { HostAttributeToken } from './host-attribute-token';
import { Provider } from './provider';
export const Type = Function;

export function isType(v: any): v is Type<any> {
  return typeof v === 'function';
}

export interface Type<T> extends Function {
  new(...args: any[]): T;
}

export type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

/**
 * abstract 类
 */
export interface AbstractType<T = any> extends Function {
  prototype: T;
}
export type StringToken<T> = string & { __type?: T };
export type SymbolToken<T> = symbol & { __type?: T };
/**
 * 注入令牌的类型定义，支持多种令牌类型
 */
export type InjectionTokenType<T> =
  | InjectionToken<T>
  | HostAttributeToken<T>
  | Type<T>
  | AbstractType<T>
  | StringToken<T>
  | SymbolToken<T>
  | Function
  | ForwardRef<InjectionTokenType<T>>;

/**
 * 抽象注入器基类，提供依赖注入的核心接口
 * 支持层次化注入器结构和类型安全的依赖获取
 */
export abstract class Injector {
  constructor(public parent?: Injector) { }

  /**
   * 获取指定令牌的依赖实例
   * @param token 注入令牌
   * @returns 依赖实例
   */
  abstract get<T>(token: InjectionTokenType<T>, def?: T): T;
  abstract set(providers: (Provider | Type<any> | Function)[]): void;
  abstract destroy(): Promise<void>;
  abstract init(): Promise<void>;
}
export const INJECTOR = new InjectionToken<Injector>('INJECTOR');