---
name: prompt-renderer
description: React-based prompt rendering framework for AI agents. Use when building AI agent interfaces with React components that render to markdown prompts, implementing routing systems for prompt navigation, creating browser-like environments for prompt-based applications, or extracting interactive tools from React component trees. Supports virtual DOM reconciliation, route matching with dynamic parameters, navigation history management, and tool extraction from UI elements.
---

# Prompt Renderer Framework

React-based framework for rendering AI agent prompts using React components and a custom reconciler.

## Core Concepts

The prompt-renderer package provides three main systems:

1. **Reconciler** - Virtual DOM that renders React components to markdown
2. **Router** - URL-based navigation with pattern matching and history
3. **Browser** - Page management with route-based rendering and tool execution

## Quick Start

```typescript
import { createBrowser } from '@sker/prompt-renderer';

const browser = createBrowser({
  routes: [
    {
      path: '/dashboard',
      component: DashboardComponent,
      tools: [
        {
          name: 'refresh',
          handler: async () => { /* ... */ },
          description: 'Refresh dashboard data'
        }
      ]
    }
  ]
});

const page = browser.open('prompt://app/dashboard');
const { prompt, tools } = page.render();
```

## When to Use This Skill

Use this skill when:
- Building AI agent interfaces with React components
- Creating prompt-based applications with routing
- Implementing navigation between different prompt states
- Extracting interactive tools from component trees
- Rendering React components to markdown format

## Architecture Overview

See [ARCHITECTURE.md](references/ARCHITECTURE.md) for detailed system design.

## Component Scenarios

### Reconciler Usage
See [RECONCILER.md](references/RECONCILER.md) for:
- Rendering React to markdown
- Virtual DOM manipulation
- Tool extraction from components
- Custom element handling

### Router Usage
See [ROUTER.md](references/ROUTER.md) for:
- Route pattern matching
- Dynamic parameters
- Navigation history
- URL parsing and building

### Browser & Page Usage
See [BROWSER.md](references/BROWSER.md) for:
- Creating browser instances
- Page rendering
- Tool execution
- Context management
