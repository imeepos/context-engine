import { createLogger, LoggerLevel } from '@sker/core';
import { resolveMethodParamsFromHonoContext } from './param-resolver';
import { defaultErrorResponse, defaultResponseSerializer } from './response';
import { getRegisteredControllers, scanControllerRoutes } from './route-metadata';
import type {
  BeforeInvokeResult,
  HonoContext,
  RegisterControllersApplication,
  RegisterSkerControllersOptions,
  RouteDefinition,
  HonoLike,
} from './types';

function isBeforeInvokeResult(value: unknown): value is BeforeInvokeResult {
  return value !== null && typeof value === 'object' && ('providers' in value || 'response' in value);
}

export function registerSkerControllers(
  app: HonoLike,
  application: RegisterControllersApplication,
  options: RegisterSkerControllersOptions = {}
): void {
  const loggerLevel = options.loggerLevel ?? LoggerLevel.info;
  const logger = createLogger('SkerHonoRegistrar', loggerLevel);

  try {
    const controllers = getRegisteredControllers();
    logger.debug(`Found ${controllers.length} controllers`);

    for (const controller of controllers) {
      const routes = scanControllerRoutes(controller);
      logger.debug(`Controller ${controller.name} has ${routes.length} routes`);

      for (const route of routes) {
        app[route.honoMethod](route.fullPath, async (ctx: HonoContext) => {
          try {
            const early = await options.beforeInvoke?.(ctx, route);
            if (early instanceof Response) {
              return early;
            }

            const beforeResult = isBeforeInvokeResult(early) ? early : undefined;
            if (beforeResult?.response) {
              return beforeResult.response;
            }

            const moduleRef = application.getModuleRefByFeature(route.controller);
            if (!moduleRef) {
              throw new Error(`No module found for controller ${route.controller.name}`);
            }

            const factory = moduleRef.getFeatureFactory(route.controller);
            const baseProviders = options.baseProviders?.(ctx, route) ?? [];
            const beforeProviders = beforeResult?.providers ?? [];
            const controllerInstance = factory([...baseProviders, ...beforeProviders]);

            const params = await resolveMethodParamsFromHonoContext(ctx, route.argsMetadata, {
              parseBody: options.parseBody,
              route,
            });

            const handler = (controllerInstance as Record<string, ((...args: unknown[]) => unknown) | undefined>)[
              route.methodName
            ];
            if (!handler) {
              throw new Error(
                `Controller method ${route.controller.name}.${route.methodName} is not callable on instance`
              );
            }
            const result = await handler.apply(controllerInstance, params);

            const afterResponse = await options.afterInvoke?.(ctx, route, result);
            if (afterResponse) {
              return afterResponse;
            }

            const serializer = options.responseSerializer ?? ((value: unknown) => defaultResponseSerializer(value));
            return await serializer(result, ctx, route);
          } catch (error) {
            if (options.onError) {
              return await options.onError(error, ctx, route);
            }
            return defaultErrorResponse(error);
          }
        });
      }
    }

    logger.debug('Controller registration completed');
  } catch (error) {
    logger.error(`Failed to register controllers: ${error}`);
  }
}

export function registerControllers(
  app: HonoLike,
  application: RegisterControllersApplication,
  loggerLevel: LoggerLevel = LoggerLevel.info
): void {
  registerSkerControllers(app, application, { loggerLevel });
}

export type { RouteDefinition };
