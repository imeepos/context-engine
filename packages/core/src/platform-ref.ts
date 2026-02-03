import { Injector } from './injector';
import { Provider } from './provider';
import { ApplicationRef } from './application-ref';
import { EnvironmentInjector } from './environment-injector';

/**
 * 平台引用类，管理 platformInjector
 * 提供平台级别的生命周期管理，支持创建多个应用实例
 */
export class PlatformRef {
  private applications: ApplicationRef[] = [];
  private _isDestroyed = false;

  constructor(public readonly injector: Injector) { }

  /**
   * 创建并启动应用实例
   * @param providers 应用级提供者
   * @returns 新的应用引用
   */
  bootstrapApplication(providers: Provider[] = []): ApplicationRef {
    if (this._isDestroyed) {
      throw new Error('Cannot bootstrap application on destroyed platform');
    }

    const appInjector = EnvironmentInjector.createApplicationInjector([
      ...providers,
      {
        provide: ApplicationRef, useFactory: () => {
          return new ApplicationRef(appInjector);
        }, deps: [Injector]
      },
    ])

    return appInjector.get(ApplicationRef);
  }

  /**
   * 销毁平台及所有应用
   */
  async destroy(): Promise<void> {
    if (this._isDestroyed) return;

    for (const app of this.applications) {
      await app.destroy();
    }
    this.applications = [];

    if (typeof (this.injector as any).destroy === 'function') {
      await (this.injector as any).destroy();
    }

    this._isDestroyed = true;
  }

  /**
   * 平台是否已销毁
   */
  get isDestroyed(): boolean {
    return this._isDestroyed;
  }
}
