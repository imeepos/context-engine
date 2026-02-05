import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Module, DynamicModule, isDynamicModule } from '../decorators/module.decorator';
import { createPlatform } from '../platform';
import { PlatformRef } from '../platform-ref';
import { ApplicationRef } from '../application-ref';
import { Injectable } from '../injectable';

describe('DynamicModule', () => {
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

  describe('isDynamicModule', () => {
    it('should return true for valid DynamicModule', () => {
      @Module({})
      class TestModule {}

      const dynamicModule: DynamicModule = {
        module: TestModule,
        providers: [],
      };

      expect(isDynamicModule(dynamicModule)).toBe(true);
    });

    it('should return false for static module', () => {
      @Module({})
      class TestModule {}

      expect(isDynamicModule(TestModule)).toBe(false);
    });

    it('should return false for non-module objects', () => {
      expect(isDynamicModule({})).toBe(false);
      expect(isDynamicModule(null)).toBe(false);
      expect(isDynamicModule(undefined)).toBe(false);
    });
  });

  describe('forRoot pattern', () => {
    it('should support forRoot with dynamic providers', async () => {
      const CONFIG = Symbol('CONFIG');

      @Injectable()
      class ConfigService {
        constructor(public config: any) {}
      }

      @Module({})
      class ConfigModule {
        static forRoot(config: any): DynamicModule {
          return {
            module: ConfigModule,
            providers: [
              { provide: CONFIG, useValue: config },
              {
                provide: ConfigService,
                useFactory: (cfg: any) => new ConfigService(cfg),
                deps: [CONFIG],
              },
            ],
          };
        }
      }

      await app.bootstrap(ConfigModule.forRoot({ apiUrl: 'http://localhost:3000' }));

      const config = app.injector.get<any>(CONFIG);
      expect(config.apiUrl).toBe('http://localhost:3000');

      const configService = app.injector.get(ConfigService);
      expect(configService.config.apiUrl).toBe('http://localhost:3000');
    });

    it('should support importing DynamicModule in static module', async () => {
      const DB_CONFIG = Symbol('DB_CONFIG');

      @Module({})
      class DatabaseModule {
        static forRoot(config: any): DynamicModule {
          return {
            module: DatabaseModule,
            providers: [{ provide: DB_CONFIG, useValue: config }],
          };
        }
      }

      @Module({
        imports: [DatabaseModule.forRoot({ host: 'localhost', port: 5432 })],
      })
      class AppModule {}

      await app.bootstrap(AppModule);

      const dbConfig = app.injector.get<any>(DB_CONFIG);
      expect(dbConfig.host).toBe('localhost');
      expect(dbConfig.port).toBe(5432);
    });

    it('should support nested DynamicModule imports', async () => {
      const LOG_LEVEL = Symbol('LOG_LEVEL');
      const DB_CONFIG = Symbol('DB_CONFIG');

      @Module({})
      class LoggerModule {
        static forRoot(level: string): DynamicModule {
          return {
            module: LoggerModule,
            providers: [{ provide: LOG_LEVEL, useValue: level }],
          };
        }
      }

      @Module({})
      class DatabaseModule {
        static forRoot(config: any): DynamicModule {
          return {
            module: DatabaseModule,
            imports: [LoggerModule.forRoot('debug')],
            providers: [{ provide: DB_CONFIG, useValue: config }],
          };
        }
      }

      await app.bootstrap(DatabaseModule.forRoot({ host: 'localhost' }));

      const dbConfig = app.injector.get<any>(DB_CONFIG);
      expect(dbConfig.host).toBe('localhost');

      const logLevel = app.injector.get<string>(LOG_LEVEL);
      expect(logLevel).toBe('debug');
    });

    it('should support multiple forRoot calls with different configs', async () => {
      const CONFIG = Symbol('CONFIG');

      @Module({})
      class ConfigModule {
        static forRoot(config: any): DynamicModule {
          return {
            module: ConfigModule,
            providers: [{ provide: CONFIG, useValue: config }],
          };
        }
      }

      const app1 = platform.bootstrapApplication();
      await app1.bootstrap(ConfigModule.forRoot({ env: 'dev' }));
      const config1 = app1.injector.get<any>(CONFIG);
      expect(config1.env).toBe('dev');

      const app2 = platform.bootstrapApplication();
      await app2.bootstrap(ConfigModule.forRoot({ env: 'prod' }));
      const config2 = app2.injector.get<any>(CONFIG);
      expect(config2.env).toBe('prod');

      await app1.destroy();
      await app2.destroy();
    });
  });
});
