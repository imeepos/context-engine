# @sker/hono

`@sker/hono` provides a reusable controller registration pipeline for Hono based on `@sker/core` metadata.

## What it handles

- Scans controllers from `@sker/core` metadata (`CONTROLLES`, `PATH_METADATA`, `METHOD_METADATA`, `ROUTE_ARGS_METADATA`).
- Sorts routes by priority (static before dynamic).
- Resolves `@Param/@Query/@Body` arguments with optional zod parsing.
- Creates controller instances through `ApplicationRef` module factories.
- Supports pluggable `beforeInvoke`, `afterInvoke`, `onError`, and `responseSerializer` hooks.

## Quick start

```ts
import { registerSkerControllers } from '@sker/hono';
import { REQUEST, LoggerLevel } from '@sker/core';

registerSkerControllers(app, application, {
  loggerLevel: LoggerLevel.info,
  baseProviders: (ctx) => [
    { provide: REQUEST, useValue: ctx.req.raw },
  ],
  beforeInvoke: async (ctx, route) => {
    if (route.permissions) {
      // auth / permission check
      return {
        providers: [
          { provide: 'SESSION', useValue: { userId: 'u1' } },
        ],
      };
    }
  },
  onError: (error) => {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  },
});
```

## Migration notes from app-local registrar

- Keep business auth and permission checks in your app (`beforeInvoke`).
- Keep app-specific tokens (for example DB/session tokens) in your app and inject them through hooks.
- Let `@sker/hono` own route scanning, sorting, parameter resolving, and invocation pipeline.

## Public API

- `registerSkerControllers(app, application, options)`
- `compareRoutePriority(pathA, pathB)`
- `resolveMethodParams(argsMetadata, input)`
- `resolveMethodParamsFromHonoContext(ctx, argsMetadata, options)`
- `scanControllerRoutes(controller)`
