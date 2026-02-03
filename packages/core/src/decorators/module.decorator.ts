import 'reflect-metadata';
import { Type, InjectionTokenType } from '../injector';
import { Provider } from '../provider';

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
  imports?: (Type<any> | DynamicModule)[];

  /**
   * 导出的服务或令牌，供其他模块使用
   */
  exports?: InjectionTokenType<any>[];

  /**
   * 功能级别的服务，将在 featureInjector 中注册
   * 用于请求级别或其他需要隔离的场景
   */
  features?: Provider[];
}

/**
 * 动态模块接口，用于支持 forRoot 等动态配置模式
 */
export interface DynamicModule extends ModuleMetadata {
  /**
   * 模块类型
   */
  module: Type<any>;
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
 * 检查是否为动态模块
 */
export function isDynamicModule(value: any): value is DynamicModule {
  return !!value && typeof value === 'object' && 'module' in value;
}

/**
 * 获取模块的导出 providers
 */
function getModuleExports(moduleType: Type<any> | DynamicModule): Provider[] {
  // 处理 DynamicModule
  if (isDynamicModule(moduleType)) {
    const exportedProviders: Provider[] = [];

    if (!moduleType.exports || moduleType.exports.length === 0) {
      return exportedProviders;
    }

    const allProviders = resolveModule(moduleType);

    for (const exportToken of moduleType.exports) {
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

  // 处理静态模块
  const metadata = getModuleMetadata(moduleType);
  if (!metadata) {
    throw new Error(`${moduleType.name} is not a valid module. Did you forget @Module() decorator?`);
  }

  const exportedProviders: Provider[] = [];

  if (!metadata.exports || metadata.exports.length === 0) {
    return exportedProviders;
  }

  const allProviders = resolveModule(moduleType);

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
export function resolveModule(moduleType: Type<any> | DynamicModule): Provider[] {
  // 处理 DynamicModule
  if (isDynamicModule(moduleType)) {
    const providers: Provider[] = [];

    // 递归解析 imports，只获取导出的 providers
    if (moduleType.imports) {
      for (const importedModule of moduleType.imports) {
        const exportedProviders = getModuleExports(importedModule);
        providers.push(...exportedProviders);
      }
    }

    // 添加 DynamicModule 的 providers
    if (moduleType.providers) {
      providers.push(...moduleType.providers);
    }

    return providers;
  }

  // 处理静态模块
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

/**
 * 解析模块的 features，展平 imports 并合并 features
 */
export function resolveFeatures(moduleType: Type<any> | DynamicModule): Provider[] {
  // 处理 DynamicModule
  if (isDynamicModule(moduleType)) {
    const features: Provider[] = [];

    // 递归解析 imports 的 features
    if (moduleType.imports) {
      for (const importedModule of moduleType.imports) {
        const importedFeatures = resolveFeatures(importedModule);
        features.push(...importedFeatures);
      }
    }

    // 添加 DynamicModule 的 features
    if (moduleType.features) {
      features.push(...moduleType.features);
    }

    return features;
  }

  // 处理静态模块
  const metadata = getModuleMetadata(moduleType);
  if (!metadata) {
    throw new Error(`${moduleType.name} is not a valid module. Did you forget @Module() decorator?`);
  }

  const features: Provider[] = [];

  // 递归解析 imports 的 features
  if (metadata.imports) {
    for (const importedModule of metadata.imports) {
      const importedFeatures = resolveFeatures(importedModule);
      features.push(...importedFeatures);
    }
  }

  // 添加当前模块的 features
  if (metadata.features) {
    features.push(...metadata.features);
  }

  return features;
}
