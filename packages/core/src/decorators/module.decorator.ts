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
   * 支持直接传入类（会自动转换为 {provide: Class, useClass: Class}）
   */
  providers?: (Type<any> | Provider)[];

  /**
   * 导入的其他模块
   */
  imports?: (Type<any> | DynamicModule)[];

  /**
   * 导出的服务，供其他模块使用
   * 支持直接传入类、Provider 或 InjectionToken
   */
  exports?: (Type<any> | Provider | InjectionToken<any>)[];

  /**
   * 功能级别的服务，将在 featureInjector 中注册
   * 用于请求级别或其他需要隔离的场景
   * 支持直接传入类（会自动转换为 {provide: Class, useClass: Class}）
   */
  features?: (Type<any> | Provider)[];
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
 *   imports: [LoggerModule]
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
 * 解析模块，展平 imports 并合并 providers
 */
export function resolveModule(moduleType: Type<any> | DynamicModule): Provider[] {
  // 处理 DynamicModule
  if (isDynamicModule(moduleType)) {
    const providers: Provider[] = [];

    // 递归解析 imports，获取所有 providers
    if (moduleType.imports) {
      for (const importedModule of moduleType.imports) {
        const importedProviders = resolveModule(importedModule);
        providers.push(...importedProviders);
      }
    }

    // 添加 DynamicModule 的 providers（转换 Type<any>）
    if (moduleType.providers) {
      providers.push(...moduleType.providers.map(normalizeProvider));
    }

    return providers;
  }

  // 处理静态模块
  const metadata = getModuleMetadata(moduleType);
  if (!metadata) {
    throw new Error(`${moduleType.name} is not a valid module. Did you forget @Module() decorator?`);
  }

  const providers: Provider[] = [];

  // 递归解析 imports，获取所有 providers
  if (metadata.imports) {
    for (const importedModule of metadata.imports) {
      const importedProviders = resolveModule(importedModule);
      providers.push(...importedProviders);
    }
  }

  // 添加当前模块的 providers（转换 Type<any>）
  if (metadata.providers) {
    providers.push(...metadata.providers.map(normalizeProvider));
  }

  return providers;
}

/**
 * 标准化 provider，将 Type<any> 转换为 ClassProvider
 */
function normalizeProvider(provider: Type<any> | Provider): Provider {
  if (typeof provider === 'function') {
    return { provide: provider, useClass: provider };
  }
  return provider;
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

    // 添加 DynamicModule 的 features（转换 Type<any>）
    if (moduleType.features) {
      features.push(...moduleType.features.map(normalizeProvider));
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

  // 添加当前模块的 features（转换 Type<any>）
  if (metadata.features) {
    features.push(...metadata.features.map(normalizeProvider));
  }

  return features;
}
