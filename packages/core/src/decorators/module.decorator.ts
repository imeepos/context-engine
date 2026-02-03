import 'reflect-metadata';
import { Type } from '../injector';
import { Provider } from '../provider';
import { InjectionToken } from '../injection-token';

/**
 * 模块元数据接口
 */
export interface ModuleMetadata {
  /**
   * 模块提供的服务
   */
  providers?: Provider[];

  /**
   * 导入的其他模块
   */
  imports?: Type<any>[];

  /**
   * 导出的服务或令牌，供其他模块使用
   */
  exports?: (Type<any> | InjectionToken<any>)[];
}

const MODULE_METADATA_KEY = Symbol('module:metadata');

/**
 * Module 装饰器，用于声明模块
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [UserService, DatabaseService],
 *   imports: [LoggerModule],
 *   exports: [UserService]
 * })
 * class UserModule {}
 * ```
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target);
  };
}

/**
 * 获取模块元数据
 */
export function getModuleMetadata(target: Type<any>): ModuleMetadata | undefined {
  return Reflect.getMetadata(MODULE_METADATA_KEY, target);
}

/**
 * 检查是否为模块
 */
export function isModule(target: any): boolean {
  return Reflect.hasMetadata(MODULE_METADATA_KEY, target);
}

/**
 * 获取模块的导出 providers
 */
function getModuleExports(moduleType: Type<any>): Provider[] {
  const metadata = getModuleMetadata(moduleType);
  if (!metadata) {
    throw new Error(`${moduleType.name} is not a valid module. Did you forget @Module() decorator?`);
  }

  const exportedProviders: Provider[] = [];

  // 如果没有 exports，返回空数组
  if (!metadata.exports || metadata.exports.length === 0) {
    return exportedProviders;
  }

  // 收集所有 providers（包括 imports 的）
  const allProviders = resolveModule(moduleType);

  // 只返回在 exports 中声明的 providers
  for (const exportToken of metadata.exports) {
    const provider = allProviders.find(p => {
      const provideToken = typeof p === 'function' ? p : (p as any).provide;
      return provideToken === exportToken;
    });
    if (provider) {
      exportedProviders.push(provider);
    }
  }

  return exportedProviders;
}

/**
 * 解析模块，展平 imports 并合并 providers
 */
export function resolveModule(moduleType: Type<any>): Provider[] {
  const metadata = getModuleMetadata(moduleType);
  if (!metadata) {
    throw new Error(`${moduleType.name} is not a valid module. Did you forget @Module() decorator?`);
  }

  const providers: Provider[] = [];

  // 递归解析 imports，只获取导出的 providers
  if (metadata.imports) {
    for (const importedModule of metadata.imports) {
      const exportedProviders = getModuleExports(importedModule);
      providers.push(...exportedProviders);
    }
  }

  // 添加当前模块的 providers
  if (metadata.providers) {
    providers.push(...metadata.providers);
  }

  return providers;
}
