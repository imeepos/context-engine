# Architecture Overview

## System Design

The prompt-renderer package consists of three interconnected systems:

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  - Route management                              │
│  - Page creation                                 │
│  - Context handling                              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│                    Page                          │
│  - Component rendering                           │
│  - Tool execution                                │
│  - Navigation                                    │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│  Reconciler  │      │    Router    │
│  - VNode     │      │  - Matching  │
│  - Markdown  │      │  - History   │
│  - Tools     │      │  - Hooks     │
└──────────────┘      └──────────────┘
```

## Core Components

### 1. Reconciler System

**Purpose**: Virtual DOM for React-to-markdown rendering

**Key Files**:
- `reconciler/types.ts` - VNode type definitions
- `reconciler/dom.ts` - VNode creation functions
- `reconciler/renderer.ts` - Markdown rendering logic
- `reconciler/extractor.ts` - Tool extraction from VNodes

**Data Flow**:
```
React Component → VNode Tree → Markdown String
                            → Tool Array
```

### 2. Router System

**Purpose**: URL-based navigation and route matching

**Key Files**:
- `router/url.ts` - URL parsing and building
- `router/matcher.ts` - Pattern matching and ranking
- `router/history.ts` - Navigation history management
- `router/hooks.ts` - React hooks for routing

**Features**:
- Dynamic parameters (`:id`)
- Optional parameters (`:id?`)
- Wildcard routes (`*`)
- Route ranking by specificity

### 3. Browser & Page System

**Purpose**: Application-level page management

**Key Files**:
- `browser/browser.ts` - Browser instance creation
- `browser/page.ts` - Page rendering and tool execution

**Responsibilities**:
- Route-to-component mapping
- Tool registration and execution
- Context management (cookies, localStorage)
- Navigation subscriptions

## Type System

### VNode Types

```typescript
type VNode = TextNode | ElementNode

interface TextNode {
  type: 'TEXT';
  content: string;
}

interface ElementNode {
  type: string;
  props: Record<string, any>;
  children: VNode[];
}
```

### Tool Types

```typescript
interface Tool {
  name: string;
  type: 'button' | 'input';
  label?: string;
  params?: any;
  inputType?: string;
  placeholder?: string;
}
```

## Rendering Pipeline

1. **Component Execution**: React component renders to VNode tree
2. **Markdown Conversion**: VNode tree converts to markdown string
3. **Tool Extraction**: Interactive elements extracted as tools
4. **Result Assembly**: Prompt and tools returned together

## Navigation Flow

1. **URL Request**: `browser.open('prompt://app/path')`
2. **Route Matching**: Find matching route pattern
3. **Page Creation**: Create page with component and tools
4. **Rendering**: Execute component and generate output
5. **Tool Execution**: Handle tool calls from AI agent

## Context Management

Browser and page contexts support:
- **Cookies**: Session data persistence
- **LocalStorage**: Client-side state
- **Custom Context**: Application-specific data

Context flows from browser → page → component props.
