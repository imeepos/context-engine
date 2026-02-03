import { Injector, Type } from './injector';
import { APP_INITIALIZER, type Initializer } from './app-initializer';
import { isOnInit } from './on-init';
import { isOnDestroy } from './lifecycle';
import { EnvironmentInjector } from './environment-injector';
import { resolveModule, DynamicModule } from './decorators/module.decorator';

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
      if (typeof (this.injector as EnvironmentInjector).set === 'function') {
        (this.injector as EnvironmentInjector).set(providers);
      }
    }

    // 执行 APP_INITIALIZER
    await this.runInitializers();

    // 触发所有服务的 OnInit
    await this.runOnInit();

    this._isBootstrapped = true;
  }

  /**
   * 执行所有 APP_INITIALIZER
   */
  private async runInitializers(): Promise<void> {
    // 手动执行初始化器
    const initializers = this.injector.get<Initializer[]>(APP_INITIALIZER, []);
    for (const initializer of initializers) {
      await initializer.init();
    }
  }

  /**
   * 触发所有服务的 OnInit
   */
  private async runOnInit(): Promise<void> {
    if (typeof (this.injector as EnvironmentInjector).init === 'function') {
      await (this.injector as EnvironmentInjector).init();
    }
  }

  /**
   * 销毁应用：触发 OnDestroy，清理资源
   */
  async destroy(): Promise<void> {
    if (this._isDestroyed) return;

    if (typeof (this.injector as EnvironmentInjector).destroy === 'function') {
      await (this.injector as EnvironmentInjector).destroy();
    }

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
