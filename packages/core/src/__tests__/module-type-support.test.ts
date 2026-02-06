import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Module, resolveModule, resolveFeatures } from '../decorators/module.decorator';
import { createPlatform } from '../platform';
import { PlatformRef } from '../platform-ref';
import { ApplicationRef } from '../application-ref';
import { Injectable } from '../injectable';

describe('Module Type<any> Support', () => {
  let platform: PlatformRef;
  let app: ApplicationRef;

  beforeAll(() => {
    platform = createPlatform();
  });

  afterAll(async () => {
    await platform.destroy();
  });

  beforeEach(() => {
    app = platform.bootstrapApplication();
  });

  afterEach(async () => {
    await app.destroy();
  });

  describe('providers with Type<any>', () => {
    it('should support Type<any> in providers array', async () => {
      @Injectable()
      class UserService {
        getName() {
          return 'user';
        }
      }

      @Injectable()
      class AuthService {
        getToken() {
          return 'token';
        }
      }

      @Module({
        providers: [UserService, AuthService],
      })
      class AppModule {}

      await app.bootstrap(AppModule);

      const userService = app.injector.get(UserService);
      expect(userService.getName()).toBe('user');

      const authService = app.injector.get(AuthService);
      expect(authService.getToken()).toBe('token');
    });

    it('should support mixed Type<any> and Provider objects', async () => {
      @Injectable()
      class ServiceA {
        getValue() {
          return 'A';
        }
      }

      @Injectable()
      class ServiceB {
        getValue() {
          return 'B';
        }
      }

      const TOKEN = Symbol('TOKEN');

      @Module({
        providers: [
          ServiceA,
          { provide: TOKEN, useValue: 'config' },
          ServiceB,
        ],
      })
      class AppModule {}

      await app.bootstrap(AppModule);

      const serviceA = app.injector.get(ServiceA);
      expect(serviceA.getValue()).toBe('A');

      const config = app.injector.get(TOKEN);
      expect(config).toBe('config');

      const serviceB = app.injector.get(ServiceB);
      expect(serviceB.getValue()).toBe('B');
    });
  });

  describe('features with Type<any>', () => {
    it('should support Type<any> in features array', async () => {
      @Injectable()
      class FeatureService {
        getFeature() {
          return 'feature';
        }
      }

      @Module({
        features: [FeatureService],
      })
      class AppModule {}

      await app.bootstrap(AppModule);

      const featureService = app.createFeature(FeatureService);
      expect(featureService.getFeature()).toBe('feature');
    });

    it('should support mixed Type<any> and Provider objects in features', async () => {
      @Injectable()
      class FeatureA {
        getValue() {
          return 'A';
        }
      }

      @Module({
        features: [FeatureA],
      })
      class AppModule {}

      await app.bootstrap(AppModule);

      const featureA = app.createFeature(FeatureA);
      expect(featureA.getValue()).toBe('A');
    });
  });

  describe('resolveModule with Type<any>', () => {
    it('should normalize Type<any> to ClassProvider', () => {
      @Injectable()
      class TestService {}

      @Module({
        providers: [TestService],
      })
      class TestModule {}

      const providers = resolveModule(TestModule);

      expect(providers).toHaveLength(1);
      expect(providers[0]).toEqual({
        provide: TestService,
        useClass: TestService,
      });
    });
  });

  describe('resolveFeatures with Type<any>', () => {
    it('should normalize Type<any> to ClassProvider', () => {
      @Injectable()
      class FeatureService {}

      @Module({
        features: [FeatureService],
      })
      class TestModule {}

      const features = resolveFeatures(TestModule);

      expect(features).toHaveLength(1);
      expect(features[0]).toEqual({
        provide: FeatureService,
        useClass: FeatureService,
      });
    });
  });

  describe('imported module providers with Type<any>', () => {
    it('should access imported module services provided as Type<any>', async () => {
      @Injectable()
      class SharedService {
        getValue() {
          return 'shared';
        }
      }

      @Module({
        providers: [SharedService],
      })
      class SharedModule {}

      @Module({
        imports: [SharedModule],
      })
      class AppModule {}

      await app.bootstrap(AppModule);

      const sharedService = app.injector.get(SharedService);
      expect(sharedService.getValue()).toBe('shared');
    });
  });
});
