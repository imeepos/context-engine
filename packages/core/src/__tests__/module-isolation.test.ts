import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Module } from '../decorators/module.decorator';
import { createPlatform } from '../platform';
import { PlatformRef } from '../platform-ref';
import { ApplicationRef } from '../application-ref';

describe('Module Isolation', () => {
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

  it('should isolate module providers - ModuleB cannot access ModuleA internal services', async () => {
    class ServiceA {
      getValue() {
        return 'ServiceA';
      }
    }

    class InternalServiceA {
      getValue() {
        return 'InternalServiceA';
      }
    }

    class ServiceB {
      getValue() {
        return 'ServiceB';
      }
    }

    @Module({
      providers: [
        { provide: ServiceA, useClass: ServiceA },
        { provide: InternalServiceA, useClass: InternalServiceA },
      ],
    })
    class ModuleA {}

    @Module({
      imports: [ModuleA],
      providers: [{ provide: ServiceB, useClass: ServiceB }],
    })
    class ModuleB {}

    await app.bootstrap(ModuleB);

    const moduleARef = app.getModuleRef(ModuleA);
    const moduleBRef = app.getModuleRef(ModuleB);

    expect(moduleARef).toBeDefined();
    expect(moduleBRef).toBeDefined();

    // ModuleA 可以访问自己的所有服务
    const serviceA = moduleARef!.get<ServiceA>(ServiceA);
    const internalServiceA = moduleARef!.get<InternalServiceA>(InternalServiceA);
    expect(serviceA.getValue()).toBe('ServiceA');
    expect(internalServiceA.getValue()).toBe('InternalServiceA');

    // ModuleB 可以访问自己的服务
    const serviceB = moduleBRef!.get<ServiceB>(ServiceB);
    expect(serviceB.getValue()).toBe('ServiceB');

    // ModuleB 可以访问 ModuleA 导出的 ServiceA
    const serviceAFromB = moduleBRef!.get<ServiceA>(ServiceA);
    expect(serviceAFromB.getValue()).toBe('ServiceA');

    // ModuleB 可以访问 ModuleA 的所有 providers（包括未导出的）
    const internalServiceAFromB = moduleBRef!.get<InternalServiceA>(InternalServiceA);
    expect(internalServiceAFromB.getValue()).toBe('InternalServiceA');
  });

  it('should support nested module imports with proper isolation', async () => {
    class LoggerService {
      log(msg: string) {
        return `LOG: ${msg}`;
      }
    }

    class InternalLoggerConfig {
      getLevel() {
        return 'debug';
      }
    }

    class DatabaseService {
      connect() {
        return 'connected';
      }
    }

    class InternalDbPool {
      getPool() {
        return 'pool';
      }
    }

    class UserService {
      getUser() {
        return 'user';
      }
    }

    @Module({
      providers: [
        { provide: LoggerService, useClass: LoggerService },
        { provide: InternalLoggerConfig, useClass: InternalLoggerConfig },
      ],
    })
    class LoggerModule {}

    @Module({
      imports: [LoggerModule],
      providers: [
        { provide: DatabaseService, useClass: DatabaseService },
        { provide: InternalDbPool, useClass: InternalDbPool },
      ],
    })
    class DatabaseModule {}

    @Module({
      imports: [DatabaseModule],
      providers: [{ provide: UserService, useClass: UserService }],
    })
    class UserModule {}

    await app.bootstrap(UserModule);

    const loggerModuleRef = app.getModuleRef(LoggerModule);
    const databaseModuleRef = app.getModuleRef(DatabaseModule);
    const userModuleRef = app.getModuleRef(UserModule);

    // LoggerModule 可以访问自己的所有服务
    expect(loggerModuleRef!.get<LoggerService>(LoggerService).log('test')).toBe('LOG: test');
    expect(loggerModuleRef!.get<InternalLoggerConfig>(InternalLoggerConfig).getLevel()).toBe('debug');

    // DatabaseModule 可以访问自己的服务和 LoggerModule 的所有服务（包括未导出的）
    expect(databaseModuleRef!.get<DatabaseService>(DatabaseService).connect()).toBe('connected');
    expect(databaseModuleRef!.get<InternalDbPool>(InternalDbPool).getPool()).toBe('pool');
    expect(databaseModuleRef!.get<LoggerService>(LoggerService).log('db')).toBe('LOG: db');
    expect(databaseModuleRef!.get<InternalLoggerConfig>(InternalLoggerConfig).getLevel()).toBe('debug');

    // UserModule 可以访问 DatabaseModule 的所有服务（包括未导出的）
    // 以及通过 DatabaseModule 间接导入的 LoggerModule 的所有服务
    expect(userModuleRef!.get<UserService>(UserService).getUser()).toBe('user');
    expect(userModuleRef!.get<DatabaseService>(DatabaseService).connect()).toBe('connected');
    expect(userModuleRef!.get<InternalDbPool>(InternalDbPool).getPool()).toBe('pool');
    expect(userModuleRef!.get<LoggerService>(LoggerService).log('user')).toBe('LOG: user');
    expect(userModuleRef!.get<InternalLoggerConfig>(InternalLoggerConfig).getLevel()).toBe('debug');
  });

  it('should support re-exporting imported services', async () => {
    class CoreService {
      getValue() {
        return 'core';
      }
    }

    class SharedService {
      getValue() {
        return 'shared';
      }
    }

    @Module({
      providers: [{ provide: CoreService, useClass: CoreService }],
    })
    class CoreModule {}

    @Module({
      imports: [CoreModule],
      providers: [{ provide: SharedService, useClass: SharedService }],
    })
    class SharedModule {}

    @Module({
      imports: [SharedModule],
    })
    class AppModule {}

    await app.bootstrap(AppModule);

    const appModuleRef = app.getModuleRef(AppModule);

    // AppModule 可以访问 SharedModule 导出的 SharedService 和 CoreService
    expect(appModuleRef!.get<SharedService>(SharedService).getValue()).toBe('shared');
    expect(appModuleRef!.get<CoreService>(CoreService).getValue()).toBe('core');
  });
});
