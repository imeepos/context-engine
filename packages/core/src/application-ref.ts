import { Injector, Type } from './injector';
import { root } from './environment-injector';
import { resolveModule, DynamicModule } from './decorators/module.decorator';
import { getPlatformInjector } from './root';

/**
 * 应用引用类，管理 applicationInjector
 * 提供应用级别的生命周期管理
 */
export class ApplicationRef {
  private _isDestroyed = false;
  private _isBootstrapped = false;

  constructor(public readonly injector: Injector) { }

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

    // 如果提供了模块类型，解析并注册 providers
    if (moduleType) {
      const providers = resolveModule(moduleType);
      this.injector.set(providers);
    }
    await root.init();
    await getPlatformInjector().init();
    await this.injector.init();

    this._isBootstrapped = true;
  }

  /**
   * 销毁应用：触发 OnDestroy，清理资源
   */
  async destroy(): Promise<void> {
    if (this._isDestroyed) return;

    await this.injector.destroy();
    await getPlatformInjector().destroy();
    await root.destroy();

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
}
