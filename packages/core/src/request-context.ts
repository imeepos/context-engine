import { EnvironmentInjector } from './environment-injector';
import { Injector } from './injector';
import { Provider } from './provider';

/**
 * 请求上下文管理器
 * 用于管理请求级别的注入器生命周期
 */
export class RequestContext {
  private injector: EnvironmentInjector;
  private isDestroyed = false;

  constructor(
    featureProviders: Provider[],
    parentInjector: Injector,
    requestProviders: Provider[] = []
  ) {
    const allProviders = [...featureProviders, ...requestProviders];
    this.injector = EnvironmentInjector.createFeatureInjector(allProviders, parentInjector);
  }

  /**
   * 获取请求注入器
   */
  getInjector(): EnvironmentInjector {
    if (this.isDestroyed) {
      throw new Error('Request context has been destroyed');
    }
    return this.injector;
  }

  /**
   * 销毁请求上下文
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) return;

    await this.injector.destroy();
    this.isDestroyed = true;
  }

  /**
   * 请求上下文是否已销毁
   */
  get destroyed(): boolean {
    return this.isDestroyed;
  }
}

/**
 * 创建请求注入器的辅助函数
 * @param featureProviders 功能级别的 providers
 * @param parentInjector 父注入器（通常是应用注入器）
 * @param requestProviders 请求级别的 providers（如 REQUEST, RESPONSE 等）
 * @returns 请求上下文实例
 */
export function createRequestContext(
  featureProviders: Provider[],
  parentInjector: Injector,
  requestProviders: Provider[] = []
): RequestContext {
  return new RequestContext(featureProviders, parentInjector, requestProviders);
}
