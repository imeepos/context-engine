---
name: prompt-renderer
description: React-based prompt rendering framework for AI agents with dependency injection, reactive updates, and async component support. Use when building AI agent interfaces with React components that render to markdown prompts, implementing routing systems with DI integration, creating reactive prompt-based applications with state management, extracting interactive tools from React component trees, or building modular agent systems with @sker/core integration. Supports virtual DOM reconciliation, React Hooks (useState, useEffect, useMemo, useCallback, useRef), async function components, route matching with dynamic parameters, navigation history management, tool extraction from UI elements, and automatic re-rendering on state changes.
---

# Prompt Renderer Framework

React-based framework for rendering AI agent prompts using React components, dependency injection, and reactive state management.

## Core Concepts

The prompt-renderer package provides four main systems:

1. **Reconciler** - Virtual DOM that renders React components to markdown
2. **Router** - URL-based navigation with pattern matching and dynamic parameters
3. **Browser** - Page management with route-based rendering and tool execution
4. **Reactive System** - State management with React Hooks and automatic re-rendering

## Quick Start

### Basic Usage (Standalone)

```typescript
import { createBrowser } from '@sker/prompt-renderer';

const browser = createBrowser([
  { provide: ROUTES, useValue: { path: '/dashboard', component: DashboardComponent, params: {} }, multi: true }
]);

const page = await browser.open('prompt://app/dashboard');
const { prompt, tools } = await page.render();
```

### Module Integration (with DI)

```typescript
import { PromptRendererModule } from '@sker/prompt-renderer';
import { createInjector } from '@sker/core';

const injector = createInjector([
  PromptRendererModule.forRoot([
    { path: '/dashboard', component: DashboardComponent, params: {} }
  ])
]);

const browser = injector.get(Browser);
const page = await browser.open('prompt://app/dashboard');
```

### Reactive Pages with Hooks

```typescript
import { ReactiveBrowser } from '@sker/prompt-renderer/browser';
import { useState } from '@sker/prompt-renderer';

function Counter({ injector }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <Tool name="increment" execute={async () => setCount(count + 1)}>
        Increment
      </Tool>
    </div>
  );
}

const browser = new ReactiveBrowser(injector);
const page = browser.createReactivePage('/counter', Counter);

// Auto re-renders when state changes
page.onRender((result) => console.log(result.prompt));
const result = page.render();
```

## When to Use This Skill

Use this skill when:
- Building AI agent interfaces with React components
- Creating reactive prompt-based applications with state management
- Implementing navigation between different prompt states
- Extracting interactive tools from component trees
- Rendering React components to markdown format
- Integrating with @sker/core dependency injection system
- Building modular agent systems with reusable components
- Supporting async data fetching in components

## Key Features

### 1. Dependency Injection Integration
- Seamless integration with `@sker/core` DI framework
- Module-based configuration with `PromptRendererModule.forRoot()`
- Injector hierarchy for component isolation
- Provider-based service registration

### 2. Reactive State Management
- React Hooks support: `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`
- Automatic re-rendering on state changes
- RxJS-based update scheduler with debouncing
- `ReactivePage` for stateful components

### 3. Async Component Support
- Async function components with `directRenderAsync`
- Promise-based rendering pipeline
- Async data fetching in components

### 4. Tool Extraction System
- `<Tool>` component for custom tool definitions
- `<ToolUse>` component for DI-based tool extraction
- Automatic tool generation from `<Link>` components
- Semantic tool naming with deduplication

### 5. Layout Control
- `<Space>`, `<Tab>`, `<Br>` components for precise markdown formatting
- Support for all standard HTML elements (h1-h6, ul, ol, table, etc.)
- Markdown formatting (bold, italic, strikethrough, links, code blocks)

## Component Reference

### Core Components

```typescript
// Tool definition
<Tool
  name="refresh"
  description="Refresh data"
  params={z.object({ force: z.boolean() })}
  execute={async (params, injector) => { /* ... */ }}
>
  Refresh
</Tool>

// Tool from DI class
<ToolUse use={DataService} propertyKey="fetchData">
  Fetch Data
</ToolUse>

// Navigation link (auto-generates tool)
<Link to="/dashboard">Go to Dashboard</Link>

// Layout components
<Space count={4} />
<Tab />
<Br />
```

### React Hooks

```typescript
import { useState, useEffect, useMemo, useCallback, useRef } from '@sker/prompt-renderer';

function MyComponent({ injector }) {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data on mount
    fetchData().then(setData);
  }, []);

  const doubled = useMemo(() => count * 2, [count]);
  const increment = useCallback(() => setCount(c => c + 1), []);
  const ref = useRef(null);

  return <div>Count: {count}, Doubled: {doubled}</div>;
}
```

## Architecture Overview

See [ARCHITECTURE.md](references/ARCHITECTURE.md) for detailed system design.

## Advanced Usage

### Reconciler
See [RECONCILER.md](references/RECONCILER.md) for:
- Virtual DOM internals
- Custom reconciler configuration
- Direct rendering APIs
- Tool extraction mechanics

### Router
See [ROUTER.md](references/ROUTER.md) for:
- Route pattern matching algorithms
- Dynamic parameter extraction
- URL parsing and building
- Navigation history management

### Browser & Pages
See [BROWSER.md](references/BROWSER.md) for:
- Browser lifecycle management
- Page rendering pipeline
- Tool execution flow
- Injector hierarchy and scoping
