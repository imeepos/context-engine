# Contributing Guide

## Development Workflow

This is a monorepo managed with pnpm workspaces.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Build all packages sequentially |
| `pnpm dev` | Run development mode for all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run tests for all packages |
| `pnpm check-types` | Type check all packages |
| `pnpm clean` | Clean build artifacts and cache |
| `pnpm claude` | Run Claude CLI (skip permissions) |
| `pnpm codex` | Run Codex CLI (bypass approvals) |

## Environment Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build all packages:
   ```bash
   pnpm build
   ```

3. Run type checking:
   ```bash
   pnpm check-types
   ```

## Testing Procedures

Run tests across all packages:
```bash
pnpm test
```

Run tests for a specific package:
```bash
pnpm --filter <package-name> test
```

## Code Quality

Before committing:
1. `pnpm check-types` - Type checking
2. `pnpm lint` - Linting
3. `pnpm test` - Unit tests

## Framework Extraction

See [Framework Extraction Convention](./framework-extraction-convention.md) for guidelines on extracting reusable framework code.
