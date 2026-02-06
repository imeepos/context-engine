# Framework Layer Extraction Convention

This document defines how we extract reusable framework capabilities from business services.

## Goal

Move framework-level concerns into reusable packages while keeping business logic in application projects.

## Extraction checklist

1. Identify framework concerns in service code:
   - route metadata scanning
   - parameter resolver and validation bridge
   - controller invocation pipeline
   - generic response/error strategy
2. Move framework concerns into a package under `packages/*`.
3. Keep business concerns in app layer:
   - auth provider details
   - business role rules
   - app-specific tokens and environment bindings
4. Expose extension hooks instead of app-specific hard coding.
5. Add package tests for extracted behavior.
6. Replace app implementation with a thin adapter around the new package.

## API design rules

- Minimize initial API surface, then tighten after migration.
- Keep package dependencies business-agnostic.
- Prefer pure functions for reusable units (for example argument parsing and route sorting).
- Use explicit hook boundaries for auth, permission, and error mapping.

## Validation gate

For each extraction stage, pass:

- `pnpm --filter <new-package> check-types`
- `pnpm --filter <new-package> test`
- `pnpm --filter <app> check-types`
- `pnpm --filter <app> test`

## Example

`@sker/hono` is the reference implementation for extracting Hono controller registration from `apps/api`.
