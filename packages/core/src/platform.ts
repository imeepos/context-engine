import { Provider } from './provider';
import { PlatformRef } from './platform-ref';
import { EnvironmentInjector } from './environment-injector';
import { Injector } from './injector';
import { root } from './environment-injector';

/**
 * 创建平台实例
 * @param providers 平台级提供者
 * @returns 新的平台引用
 */
export function createPlatform(providers: Provider[] = []): PlatformRef {
  // 重置 platformInjectorInstance 如果已存在
  if (EnvironmentInjector.getPlatformInjector()) {
    EnvironmentInjector.resetPlatformInjector();
  }

  // 使用全局 root injector 作为 parent 创建 platform injector
  const platformInjector = new EnvironmentInjector(
    [
      ...providers,
      {
        provide: PlatformRef, useFactory: () => {
          return new PlatformRef(platformInjector);
        }, deps: [Injector]
      }
    ],
    root,  // 使用全局 root injector 作为 parent
    'platform'
  );

  // 设置为全局 platform injector
  (EnvironmentInjector as any).platformInjectorInstance = platformInjector;

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
