import { Provider } from './provider';
import { PlatformRef } from './platform-ref';
import { EnvironmentInjector, root } from './environment-injector';
import { Injector } from './injector';

/**
 * 创建平台实例
 * @param providers 平台级提供者
 * @returns 新的平台引用
 */
export function createPlatform(providers: Provider[] = []): PlatformRef {
  const platformInjector = EnvironmentInjector.createPlatformInjector([
    ...providers,
    {
      provide: PlatformRef, useFactory: () => {
        return new PlatformRef(platformInjector);
      }, deps: [Injector]
    }
  ]);
  return platformInjector.get(PlatformRef);
}

/**
 * 创建平台工厂函数
 * @param parentProviders 父级提供者（通常是根级提供者）
 * @param additionalProviders 额外的平台级提供者
 * @returns 平台工厂函数
 */
export function createPlatformFactory(
  parentProviders: Provider[] = []
): (additionalProviders?: Provider[]) => PlatformRef {
  return (additionalProviders: Provider[] = []) => {
    const allProviders = [...parentProviders, ...additionalProviders];
    return createPlatform(allProviders);
  };
}
