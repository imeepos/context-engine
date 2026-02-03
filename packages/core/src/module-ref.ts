import { InjectionTokenType, Type } from './injector';
import { EnvironmentInjector } from './environment-injector';

/**
 * 模块引用类，表示一个已实例化的模块
 * 包含模块的注入器和元数据
 */
export class ModuleRef {
  /**
   * 模块的注入器实例
   */
  public readonly injector: EnvironmentInjector;

  /**
   * 模块类型
   */
  public readonly moduleType: Type<any>;

  constructor(
    moduleType: Type<any>,
    injector: EnvironmentInjector,
  ) {
    this.moduleType = moduleType;
    this.injector = injector;
  }

  /**
   * 从模块注入器中获取服务实例
   */
  get<T>(token: InjectionTokenType<T>): T {
    return this.injector.get<T>(token);
  }

  /**
   * 销毁模块注入器
   */
  async destroy(): Promise<void> {
    await this.injector.destroy();
  }
}
