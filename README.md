# context-engine

[English](#english) | [中文](./README_CN.md)

---

### React-Based Dynamic Context Management Framework for AI Agents

An innovative framework that applies Web UI paradigms to AI Agent context management - enabling multi-agent shared context, dynamic rendering, and intelligent isolation through "virtual web pages."

## Core Innovation

### "Virtual Web Pages" for AI Agents

Traditional AI Agents use static text as context. This framework innovatively applies **Web UI paradigms to AI context management**:

- Build "virtual web pages" using React components, rendered as markdown prompts for AI Agents
- UI elements (buttons, forms, etc.) map to **Agent Tools**
- Agents "click" buttons (call tools) to manipulate and change context
- Full React ecosystem compatibility: reactivity, hooks, state management, etc.

**These aren't web pages for humans - they're interactive context interfaces for AI Agents.**

### Multi-Agent Shared Context

Through `@sker/prompt-renderer`, multiple agents can share the same context interface:

```typescript
// Create shared context "browser"
const browser = createBrowser({
  routes: [
    { path: '/dashboard', component: DashboardPage },
    { path: '/settings', component: SettingsPage }
  ]
});

// Agent A opens page
const page = browser.open('prompt://app/dashboard');

// Agent B can access the same context
// Agents change shared context by calling page tools
```

### Router-Driven Context Isolation

Use Router system to achieve context isolation and prevent context pollution:

- **Different pages = Different context spaces**
- Navigate to new page = Switch context
- Each route can have independent tools and state
- Programmatically control context switching

```typescript
// Navigate from dashboard to settings for context isolation
browser.navigate('/settings');
```

### Dynamic Context Rendering

Use React's reactive features for dynamic context management:

```typescript
function DynamicContextPage() {
  const [data, setData] = useState([]);

  // Reactive context updates
  useEffect(() => {
    // Context automatically re-renders when data changes
  }, [data]);

  return (
    <Page>
      <Button tool="refresh">Refresh Data</Button>
      <DataList items={data} />
    </Page>
  );
}
```

- **Reactive updates**: State changes automatically trigger context re-rendering
- **Hooks support**: Use useState, useEffect, etc. to manage context state
- **Component-based**: Reuse React components to build complex contexts
- **Fully programmable**: Dynamically control context content and behavior through code

## Architecture Design

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│   AI Agents (multiple agents share) │
│   - Read markdown prompts           │
│   - Call tools (click buttons)      │
│   - Change shared context           │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│   @sker/prompt-renderer             │
│   - React components → Markdown     │
│   - UI elements → Agent Tools       │
│   - Router system                   │
│   - Virtual DOM reconciliation      │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│   React Ecosystem                   │
│   - Components, Hooks, Reactivity   │
│   - State management                │
│   - Complete Web dev paradigm       │
└─────────────────────────────────────┘
```

### Workflow

1. **Define Pages**: Use React components to define context pages
2. **Render Prompts**: Components render to markdown prompts
3. **Extract Tools**: UI elements automatically convert to Agent Tools
4. **Agent Interaction**: Agents call tools to change context
5. **Reactive Updates**: State changes trigger context re-rendering
6. **Route Navigation**: Switch pages for context isolation

## Core Packages

### @sker/prompt-renderer

React-to-Markdown rendering engine providing interactive context interfaces for AI Agents.

**Core Features:**
- **Reconciler**: Virtual DOM reconciler that renders React components to markdown
- **Router**: Routing system with dynamic parameters, history, and context isolation
- **Browser**: Page manager handling routing, rendering, and tool execution
- **Tool Extraction**: Automatically extract Agent Tools from UI elements

**Usage Example:**

```typescript
import { createBrowser, Page, Button } from '@sker/prompt-renderer';

// Define context page
function DashboardPage() {
  return (
    <Page>
      <h1>Dashboard</h1>
      <Button tool="refresh">Refresh Data</Button>
      <Button tool="export">Export Report</Button>
    </Page>
  );
}

// Create browser instance
const browser = createBrowser({
  routes: [
    {
      path: '/dashboard',
      component: DashboardPage,
      tools: [
        {
          name: 'refresh',
          handler: async () => { /* refresh logic */ },
          description: 'Refresh dashboard data'
        },
        {
          name: 'export',
          handler: async () => { /* export logic */ },
          description: 'Export report'
        }
      ]
    }
  ]
});

// Open page, get prompt and tools
const page = browser.open('prompt://app/dashboard');
const { prompt, tools } = page.render();

// prompt is markdown-formatted context
// tools is list of tools available to Agent
```

### @sker/core

Lightweight dependency injection framework providing modular architecture foundation for the entire system.

**Key Features:**
- 4-tier injector hierarchy (root → platform → application → feature)
- 7 provider types with lazy loading support
- Circular dependency detection and resolution
- Lifecycle hooks (OnInit, OnDestroy)
- APP_INITIALIZER for async initialization

### Configuration Packages

- `@sker/eslint-config` - Shared ESLint configurations (flat config format)
- `@sker/typescript-config` - TypeScript configurations

## Project Structure

```
claude-templates/
├── apps/
│   └── cli/                # CLI application (multi-agent communication)
├── packages/
│   ├── core/               # @sker/core - DI framework
│   ├── prompt-renderer/    # @sker/prompt-renderer - Core rendering engine
│   ├── eslint-config/      # ESLint configurations
│   └── typescript-config/  # TypeScript configurations
├── .claude/                # Claude Code configuration
│   ├── agents/            # 12 specialized agents
│   ├── commands/          # 23 custom commands
│   ├── contexts/          # Context configurations
│   ├── rules/             # Coding standards & workflows
│   └── skills/            # 21 domain-specific skills
└── turbo.json             # Turborepo configuration
```

## Technology Stack

- **Package Manager**: pnpm 10.28.2
- **Build System**: Turborepo 2.3.3
- **TypeScript**: 5.9.2
- **Testing**: Vitest
- **Core Tech**: React + Virtual DOM + Router

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Basic Usage

```bash
# Development mode
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Use Cases

### 1. Multi-Agent Collaboration

Multiple agents share the same context interface, collaborating through UI element manipulation:

```typescript
// Agent A: Data collection agent
await callTool('collect-data');  // Click "Collect Data" button

// Agent B: Data analysis agent (shares same context)
await callTool('analyze');       // Click "Analyze" button

// Agent C: Report generation agent
await callTool('generate-report'); // Click "Generate Report" button
```

### 2. Context Isolation

Use routing to switch between different tasks, avoiding context pollution:

```typescript
// Task 1: Code review
browser.navigate('/code-review');
// Context: code files, review tools, issue list

// Task 2: Documentation generation (completely isolated context)
browser.navigate('/doc-generation');
// Context: doc templates, generation tools, preview
```

### 3. Dynamic Context

Dynamically update context based on task progress:

```typescript
function TaskPage() {
  const [progress, setProgress] = useState(0);
  const [issues, setIssues] = useState([]);

  return (
    <Page>
      <Progress value={progress} />
      <IssueList items={issues} />
      <Button tool="next-step">Next Step</Button>
    </Page>
  );
}
```

## Design Advantages

### 1. Intuitive Interaction Model
Apply familiar Web UI interaction patterns to AI Agents, lowering the barrier to understanding and usage.

### 2. Powerful Expressiveness
React component composition makes building complex contexts simple and maintainable.

### 3. Fully Programmable
Precisely control context content, structure, and behavior through code for true dynamic context management.

### 4. Context Isolation
Router system provides natural context boundaries, preventing context pollution between different tasks.

### 5. Ecosystem Compatibility
Full compatibility with React ecosystem - use existing component libraries, state management solutions, and development tools.

## License

Private project
