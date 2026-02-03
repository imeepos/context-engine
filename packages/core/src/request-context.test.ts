import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPlatform } from './platform';
import { Module } from './decorators/module.decorator';
import { Injectable } from './injectable';
import { createRequestContext } from './request-context';
import { REQUEST, RESPONSE } from './controller';
import { EnvironmentInjector } from './environment-injector';

describe('RequestContext', () => {
  let platform: any;

  beforeAll(() => {
    platform = createPlatform();
  });

  afterAll(async () => {
    await platform.destroy();
    EnvironmentInjector.resetRootInjector();
  });

  it('should create request context with feature providers', async () => {
    @Injectable()
    class RequestScopedService {
      getValue() {
        return 'request-scoped';
      }
    }

    const featureProviders = [{ provide: RequestScopedService, useClass: RequestScopedService }];

    @Module({
      features: featureProviders
    })
    class TestModule {}

    const app = platform.bootstrapApplication();
    await app.bootstrap(TestModule);

    expect(featureProviders).toHaveLength(1);

    const requestContext = createRequestContext(featureProviders, app.injector);
    const service = requestContext.getInjector().get(RequestScopedService);
    expect(service.getValue()).toBe('request-scoped');

    await requestContext.destroy();
  });

  it('should isolate request contexts', async () => {
    @Injectable({ providedIn: null })
    class CounterService {
      private count = 0;
      increment() {
        this.count++;
      }
      getCount() {
        return this.count;
      }
    }

    const featureProviders = [{ provide: CounterService, useClass: CounterService }];

    @Module({
      features: featureProviders
    })
    class TestModule2 {}

    const app = platform.bootstrapApplication();
    await app.bootstrap(TestModule2);

    const ctx1 = createRequestContext(featureProviders, app.injector);
    const ctx2 = createRequestContext(featureProviders, app.injector);

    const service1 = ctx1.getInjector().get(CounterService);
    const service2 = ctx2.getInjector().get(CounterService);

    service1.increment();
    service1.increment();
    service2.increment();

    expect(service1.getCount()).toBe(2);
    expect(service2.getCount()).toBe(1);

    await ctx1.destroy();
    await ctx2.destroy();
  });

  it('should inject request-specific providers', async () => {
    @Injectable()
    class RequestService {}

    const featureProviders = [{ provide: RequestService, useClass: RequestService }];

    @Module({
      features: featureProviders
    })
    class TestModule3 {}

    const app = platform.bootstrapApplication();
    await app.bootstrap(TestModule3);

    const mockRequest = { url: '/test', method: 'GET' };
    const mockResponse = { status: 200 };

    const requestContext = createRequestContext(
      featureProviders,
      app.injector,
      [
        { provide: REQUEST, useValue: mockRequest },
        { provide: RESPONSE, useValue: mockResponse }
      ]
    );

    const request = requestContext.getInjector().get(REQUEST);
    const response = requestContext.getInjector().get(RESPONSE);

    expect(request).toBe(mockRequest);
    expect(response).toBe(mockResponse);

    await requestContext.destroy();
  });

  it('should throw error when accessing destroyed context', async () => {
    @Module({
      features: []
    })
    class TestModule4 {}

    const app = platform.bootstrapApplication();
    await app.bootstrap(TestModule4);

    const requestContext = createRequestContext([], app.injector);
    await requestContext.destroy();

    expect(() => requestContext.getInjector()).toThrow('Request context has been destroyed');
  });
});
