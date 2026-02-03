import { describe, test, expect } from 'vitest';
import { Injectable } from '../injectable';
import { Module } from '../decorators/module.decorator';
import { createPlatform } from '../platform';
import { Inject } from '../inject';

// RED: 测试 createFeatureFactory 应该在 ModuleRef 中注入 factory
describe('Feature Factory', () => {
  test('should inject feature factory in ModuleRef', async () => {
    @Injectable()
    class RequestService {
      constructor(@Inject('req') public req: any) {}
    }

    @Module({
      features: [RequestService]
    })
    class AppModule {}

    const platform = createPlatform();
    const app = platform.bootstrapApplication();
    await app.bootstrap(AppModule);

    const moduleRef = app.getModuleRef(AppModule);

    // 使用类型安全的方法获取 factory
    const factory = moduleRef!.getFeatureFactory(RequestService);

    expect(typeof factory).toBe('function');

    await app.destroy();
    await platform.destroy();
  });

  test('should create instance with request providers', async () => {
    @Injectable()
    class RequestService {
      constructor(@Inject('req') public req: any) {}
    }

    @Module({
      features: [RequestService]
    })
    class AppModule {}

    const platform = createPlatform();
    const app = platform.bootstrapApplication();
    await app.bootstrap(AppModule);

    const moduleRef = app.getModuleRef(AppModule);
    const factory = moduleRef!.getFeatureFactory(RequestService);

    // 调用 factory 传入 req/res
    const req = { url: '/test' };
    const instance = factory([{ provide: 'req', useValue: req }]);

    expect(instance).toBeInstanceOf(RequestService);
    expect(instance.req).toBe(req);

    await app.destroy();
    await platform.destroy();
  });
});
