# claude-templates

Turborepo monorepo for Sker framework packages and applications.

## Project Structure

```
claude-templates/
├── apps/                    # Application projects (empty)
├── packages/                # Shared packages
│   ├── core/               # @sker/core - Dependency injection framework
│   ├── prompt-renderer/    # @sker/prompt-renderer - React-based prompt renderer
│   ├── eslint-config/      # @sker/eslint-config - Shared ESLint configurations
│   └── typescript-config/  # @sker/typescript-config - Shared TypeScript configurations
├── .claude/                # Claude Code configuration
│   ├── agents/            # Specialized agents (12 agents)
│   ├── commands/          # Custom commands (23 commands)
│   ├── contexts/          # Context configurations
│   ├── rules/             # Project coding standards and workflows
│   └── skills/            # Custom skills (21 skills)
├── package.json           # Root package configuration
├── pnpm-workspace.yaml    # PNPM workspace configuration
├── turbo.json             # Turborepo pipeline configuration
└── tsconfig.json          # Root TypeScript configuration
```

## Technology Stack

- **Package Manager**: pnpm@10.28.2
- **Build System**: Turborepo 2.3.3
- **TypeScript**: 5.9.2
- **Registry**: Private registry at http://43.240.223.138:4873

## Packages

### @sker/core

Lightweight dependency injection container inspired by Angular, built on reflect-metadata.

**Version**: 2.0.1

**Key Features**:
- Four-tier injector hierarchy (root → platform → application → feature)
- Seven provider types (Value, Class, Factory, Existing, Constructor, LazyClass, LazyFactory)
- Multi-value injection support
- Lifecycle hooks (OnInit, OnDestroy)
- APP_INITIALIZER for async initialization
- Circular dependency detection
- Forward reference support
- Global root injector for easy access

**Dependencies**:
- dayjs ^1.11.19
- reflect-metadata ^0.2.2
- zod ^4.2.1

**Build Tool**: tsup (for dual ESM/CJS output)

See `packages/core/CLAUDE.md` for detailed documentation.

### @sker/prompt-renderer

React-based prompt rendering framework for AI agents.

**Version**: 0.1.0

**Key Features**:
- React components that render to markdown prompts
- Virtual DOM reconciliation for prompt-based UIs
- Routing system for prompt navigation
- Browser-like environment for prompt applications
- Tool extraction from React component trees

**Dependencies**:
- react ^18.3.1
- react-reconciler ^0.29.2

**Testing**: Vitest with coverage support

See `.claude/skills/prompt-renderer/` for usage patterns.

### @sker/typescript-config

Shared TypeScript configurations for the monorepo.

**Version**: 2.0.1

**Exports**:
- `base.json` - Base TypeScript configuration
- `nextjs.json` - Next.js specific configuration
- `react-library.json` - React library configuration

### @sker/eslint-config

Shared ESLint configurations for the monorepo.

**Version**: 1.0.0

**Exports**:
- `base.js` - Base ESLint configuration
- `next.js` - Next.js specific configuration
- `react-internal.js` - React internal configuration

**Plugins**:
- @eslint/js ^9.34.0
- @next/eslint-plugin-next ^15.5.0
- eslint-plugin-react ^7.37.5
- eslint-plugin-react-hooks ^5.2.0
- eslint-plugin-turbo ^2.5.0
- typescript-eslint ^8.40.0
- eslint-config-prettier ^10.1.1
- eslint-plugin-only-warn ^1.1.0

## Turborepo Pipeline

Configured in `turbo.json`:

- **build**: Builds packages with dependency ordering, outputs to `dist/` and `.next/`
- **dev**: Development mode (no cache, persistent)
- **lint**: Linting (depends on build)
- **test**: Testing (depends on build)
- **clean**: Cleanup (no cache)

## Available Scripts

```bash
# Build all packages
pnpm build

# Development mode
pnpm dev

# Lint all packages
pnpm lint

# Run tests
pnpm test

# Clean build artifacts
pnpm clean
```

## Package-Specific Scripts

### @sker/core

```bash
cd packages/core

# Build the package (using tsup)
pnpm build

# Run Claude Code with skip permissions
pnpm claude

# Lint
pnpm lint

# Type checking
pnpm check-types

# Run tests
pnpm test

# Watch mode testing
pnpm test:watch
```

### @sker/prompt-renderer

```bash
cd packages/prompt-renderer

# Build the package
pnpm build

# Development mode with watch
pnpm dev

# Run tests
pnpm test

# Watch mode testing
pnpm test:watch

# Test coverage
pnpm test:coverage

# Lint
pnpm lint

# Type checking
pnpm check-types
```

## Development Workflow

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build all packages**:
   ```bash
   pnpm build
   ```

3. **Development mode**:
   ```bash
   pnpm dev
   ```

4. **Run tests**:
   ```bash
   pnpm test
   ```

## Publishing

Packages are configured to publish to a private registry:
- Registry: http://43.240.223.138:4873
- Access: public

## TypeScript Configuration

Root `tsconfig.json` settings:
- Target: ES2020
- Module: CommonJS
- JSX: React
- Strict mode enabled
- Composite project references
- Source maps and declarations enabled

## Claude Code Integration

This project includes comprehensive Claude Code configuration in `.claude/`:

### Agents (12 specialized agents)
- **planner** - Implementation planning for complex features
- **architect** - System design and architectural decisions
- **tdd-guide** - Test-driven development enforcement
- **code-reviewer** - Code quality and best practices review
- **security-reviewer** - Security vulnerability analysis
- **build-error-resolver** - Build and type error fixes
- **e2e-runner** - End-to-end testing with Playwright
- **refactor-cleaner** - Dead code cleanup and consolidation
- **doc-updater** - Documentation and codemap updates
- **database-reviewer** - PostgreSQL query optimization
- **go-reviewer** - Go code review specialist
- **go-build-resolver** - Go build error resolution

### Commands (23 custom commands)
Including: `/plan`, `/code-review`, `/tdd`, `/e2e`, `/build-fix`, `/refactor-clean`, `/update-docs`, `/update-codemaps`, `/skill-create`, `/learn`, `/eval`, and more.

### Skills (21 domain-specific skills)
- **di-framework** - Dependency injection patterns for @sker/core
- **prompt-renderer** - React-based prompt rendering framework
- **react-patterns** - React package usage guide
- **ink-patterns** - Ink CLI framework patterns
- **frontend-patterns** - Frontend development best practices
- **backend-patterns** - Backend architecture patterns
- **golang-patterns** - Idiomatic Go patterns
- **golang-testing** - Go testing with TDD methodology
- **postgres-patterns** - PostgreSQL optimization and security
- **clickhouse-io** - ClickHouse analytics patterns
- **coding-standards** - Universal coding standards
- **tdd-workflow** - Test-driven development workflow
- **security-review** - Security checklist and patterns
- **continuous-learning** - Pattern extraction from sessions
- **continuous-learning-v2** - Instinct-based learning system
- **skill-creator** - Guide for creating effective skills
- **eval-harness** - Formal evaluation framework
- **iterative-retrieval** - Progressive context refinement
- **strategic-compact** - Manual context compaction
- **verification-loop** - Verification patterns
- **project-guidelines-example** - Example project guidelines

### Rules
- **agents.md** - Agent orchestration and parallel execution
- **coding-style.md** - Immutability, file organization, error handling
- **git-workflow.md** - Commit format, PR workflow, feature implementation
- **hooks.md** - PreToolUse, PostToolUse, Stop hooks
- **patterns.md** - API responses, custom hooks, repository pattern
- **performance.md** - Model selection, context management
- **security.md** - Security checks, secret management
- **testing.md** - 80% coverage requirement, TDD workflow

### Contexts
- **dev.md** - Development context
- **research.md** - Research context
- **review.md** - Review context

Run Claude Code in any package:
```bash
pnpm claude
```

## Git Workflow

- Main branch: `master`
- Commit message format: `<type>: <description>`
- Types: feat, fix, refactor, docs, test, chore, perf, ci

## Key Features

### Dependency Injection (@sker/core)
- Global `root` injector accessible via `import { root } from '@sker/core'`
- Four-tier injector hierarchy with automatic resolution
- Seven provider types including lazy loading support
- Comprehensive lifecycle management with OnInit/OnDestroy
- APP_INITIALIZER for async application bootstrapping

### Prompt Rendering (@sker/prompt-renderer)
- Build AI agent interfaces using React components
- Virtual DOM reconciliation for markdown output
- Routing system with dynamic parameters
- Tool extraction from component trees
- Browser-like navigation for prompt-based apps

### Development Workflow
- Comprehensive agent system for automated tasks
- 23 custom commands for common operations
- 21 specialized skills for domain expertise
- Strict coding standards enforced via rules
- TDD workflow with 80% coverage requirement

## Notes

- Empty `apps/` directory - primarily a package library monorepo
- All packages use workspace protocol for internal dependencies
- TypeScript 5.9.2 pinned across all packages
- ESLint 9.x with flat config format
- Dual ESM/CJS output via tsup for @sker/core
- Vitest for testing with coverage support
- Private registry at http://43.240.223.138:4873
