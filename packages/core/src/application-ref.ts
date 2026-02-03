import { Injector, Type } from './injector';
import { root, EnvironmentInjector } from './environment-injector';
import { resolveModule, resolveFeatures, DynamicModule, getModuleMetadata, isDynamicModule } from './decorators/module.decorator';
import { createApplicationInjector, getPlatformInjector } from './root';
import { Provider } from './provider';
import { ModuleRef } from './module-ref';
import { InjectionToken } from './injection-token';

/**
 * FEATURE_PROVIDERS Token - 用于存储 feature 到模块的映射
 */
export const FEATURE_PROVIDERS = new InjectionToken<Map<Type<any>, Type<any>>>('FEATURE_PROVIDERS');

/**
 * 应用引用类，管理 applicationInjector
 * 提供应用级别的生命周期管理
 */
export class ApplicationRef {
  private _isDestroyed = false;
  private _isBootstrapped = false;
  private moduleRefs = new Map<Type<any>, ModuleRef>();
  private featureToModuleMap = new Map<Type<any>, Type<any>>(); // feature -> module 映射

  constructor(public readonly injector: EnvironmentInjector) { }

  /**
   * 启动应用：解析模块、执行 APP_INITIALIZER，触发 OnInit
   * @param moduleType 可选的模块类型，使用 @Module 装饰器装饰的类，或 DynamicModule
   */
  async bootstrap(moduleType?: Type<any> | DynamicModule): Promise<void> {
    if (this._isBootstrapped) {
      throw new Error('Application already bootstrapped');
    }
    if (this._isDestroyed) {
      throw new Error('Cannot bootstrap destroyed application');
    }

    // 如果提供了模块类型，创建模块注入器树
    if (moduleType) {
      const allProviders = resolveModule(moduleType);
      this.injector.set([...allProviders])
      this.createModuleInjectorTree(moduleType, this.injector);

      // 建立 feature 到 module 的索引
      this.indexFeatures(moduleType);
    }

    await root.init();
    await getPlatformInjector().init();
    await this.injector.init();

    this._isBootstrapped = true;
  }

  /**
   * 递归创建模块注入器树
   * @param moduleType 模块类型
   * @param parentInjector 父注入器
   */
  private createModuleInjectorTree(
    moduleType: Type<any> | DynamicModule,
    parentInjector: Injector,
  ): ModuleRef {
    const actualModuleType = isDynamicModule(moduleType) ? moduleType.module : moduleType;

    // 如果模块已经创建，直接返回
    if (this.moduleRefs.has(actualModuleType)) {
      return this.moduleRefs.get(actualModuleType)!;
    }

    const metadata = isDynamicModule(moduleType) ? moduleType : getModuleMetadata(actualModuleType);
    if (!metadata) {
      throw new Error(`${actualModuleType.name} is not a valid module. Did you forget @Module() decorator?`);
    }

    // 先递归创建所有导入模块的注入器
    const importedModuleRefs: ModuleRef[] = [];
    if (metadata.imports) {
      for (const importedModule of metadata.imports) {
        const importedModuleRef = this.createModuleInjectorTree(importedModule, parentInjector);
        importedModuleRefs.push(importedModuleRef);
      }
    }

    // 收集导入模块的导出 providers 和当前模块自己的 providers
    const allProviders: Provider[] = [];

    // 添加导入模块的导出服务（使用 useFactory 延迟获取）
    for (const importedModuleRef of importedModuleRefs) {
      const importedMetadata = getModuleMetadata(importedModuleRef.moduleType);
      if (importedMetadata?.exports) {
        for (const exportToken of importedMetadata.exports) {
          allProviders.push({
            provide: exportToken,
            useFactory: () => importedModuleRef.injector.get(exportToken),
          });
        }
      }
    }

    // 添加当前模块自己的 providers
    const ownProviders = metadata.providers || [];
    allProviders.push(...ownProviders);

    // 创建模块注入器，父级直接是 parentInjector
    const moduleInjector = EnvironmentInjector.createFeatureInjector(
      allProviders,
      parentInjector,
    );

    // 创建 ModuleRef 并缓存
    const moduleRef = new ModuleRef(actualModuleType, moduleInjector);
    this.moduleRefs.set(actualModuleType, moduleRef);

    return moduleRef;
  }

  /**
   * 递归索引模块的 features
   * @param moduleType 模块类型
   */
  private indexFeatures(moduleType: Type<any> | DynamicModule): void {
    const actualModuleType = isDynamicModule(moduleType) ? moduleType.module : moduleType;
    const metadata = isDynamicModule(moduleType) ? moduleType : getModuleMetadata(actualModuleType);

    if (!metadata) return;

    // 索引当前模块的 features
    if (metadata.features) {
      for (const feature of metadata.features) {
        const featureType = typeof feature === 'function' ? feature : (feature as any).provide;
        if (featureType) {
          this.featureToModuleMap.set(featureType, actualModuleType);
        }
      }
    }

    // 递归索引导入模块的 features
    if (metadata.imports) {
      for (const importedModule of metadata.imports) {
        this.indexFeatures(importedModule);
      }
    }
  }

  /**
   * 创建 feature 工厂函数
   * @param providers 请求级别的 providers（如 req/res）
   * @returns 工厂函数，用于创建 feature 实例
   */
  createFeatureFactory(providers: Provider[] = []): <T>(feature: Type<T>) => T {
    if (!this._isBootstrapped) {
      throw new Error('Cannot create feature factory before application is bootstrapped');
    }

    // 返回工厂函数
    return <T>(feature: Type<T>): T => {
      // 1. 找到 feature 所属的 moduleRef
      const moduleType = this.featureToModuleMap.get(feature);
      if (!moduleType) {
        throw new Error(`Feature ${feature.name} is not registered in any module`);
      }

      const moduleRef = this.moduleRefs.get(moduleType);
      if (!moduleRef) {
        throw new Error(`Module ${moduleType.name} not found`);
      }

      // 2. 创建 featureInjector，父级是该模块的 injector
      const featureInjector = EnvironmentInjector.createFeatureInjector(
        [{ provide: feature, useClass: feature }, ...providers],
        moduleRef.injector,
      );

      // 3. 获取并返回实例
      return featureInjector.get<T>(feature);
    };
  }

  /**
   * 创建 feature 实例
   * @param feature Feature 类型
   * @returns Feature 实例
   */
  createFeature<T>(feature: Type<T>, providers: Provider[] = []): T {
    return this.createFeatureFactory([...providers])(feature);
  }

  /**
   * 销毁应用：触发 OnDestroy，清理资源
   */
  async destroy(): Promise<void> {
    if (this._isDestroyed) return;

    // 销毁所有模块注入器
    for (const moduleRef of this.moduleRefs.values()) {
      await moduleRef.destroy();
    }
    this.moduleRefs.clear();

    await this.injector.destroy();
    // 注意：不销毁 platform 和 root 注入器，因为它们是全局单例
    // await getPlatformInjector().destroy();
    // await root.destroy();

    this._isDestroyed = true;
  }

  /**
   * 应用是否已销毁
   */
  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  /**
   * 应用是否已启动
   */
  get isBootstrapped(): boolean {
    return this._isBootstrapped;
  }

  /**
   * 创建 feature 注入器
   * @param additionalProviders 额外的 providers（可选）
   * @param moduleType 可选的模块类型，指定 feature 所属的模块
   * @returns 新的 feature 注入器实例
   */
  createFeatureInjector(additionalProviders: Provider[] = [], moduleType?: Type<any>): EnvironmentInjector {
    if (!this._isBootstrapped) {
      throw new Error('Cannot create feature injector before application is bootstrapped');
    }

    const allProviders = [...this.getFeatureProviders(), ...additionalProviders];

    // 如果指定了模块类型，使用该模块的注入器作为父级
    let parentInjector: Injector = this.injector;
    if (moduleType) {
      const moduleRef = this.moduleRefs.get(moduleType);
      if (moduleRef) {
        parentInjector = moduleRef.injector;
      }
    }

    return EnvironmentInjector.createFeatureInjector(allProviders, parentInjector);
  }

  /**
   * 获取所有 feature providers
   * @returns 所有模块的 feature providers
   */
  getFeatureProviders(): Provider[] {
    const allFeatures: Provider[] = [];

    // 遍历所有模块，收集它们的 features
    for (const moduleRef of this.moduleRefs.values()) {
      const metadata = getModuleMetadata(moduleRef.moduleType);
      if (metadata?.features) {
        allFeatures.push(...metadata.features);
      }
    }

    return allFeatures;
  }

  /**
   * 获取模块引用
   * @param moduleType 模块类型
   * @returns 模块引用，如果模块未注册则返回 undefined
   */
  getModuleRef<T = any>(moduleType: Type<T>): ModuleRef | undefined {
    return this.moduleRefs.get(moduleType);
  }

  /**
   * 获取所有模块引用
   */
  getAllModuleRefs(): ModuleRef[] {
    return Array.from(this.moduleRefs.values());
  }
}
