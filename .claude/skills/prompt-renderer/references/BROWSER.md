# Browser & Page API Reference

## Overview

The Browser and Page system provides a prompt-based application framework with routing, React component rendering, and tool execution. It uses dependency injection (@sker/core) for configuration and integrates with the reconciler system to convert React components to markdown.

## Core Concepts

### Data Flow

```
React Component → React Element → VNode → Markdown
                                        ↓
                                      Tools
```

The rendering pipeline:
1. React components are instantiated with props
2. React elements are converted to VNodes using the reconciler
3. VNodes are rendered to markdown using `renderToMarkdown()`
4. Tools are extracted from VNodes using `extractTools()`

### Type Definitions

```typescript
interface Route<T = any> {
  path: string;
  component: React.FunctionComponent<T & { injector: Injector }>;
  params: T;
}

interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

interface RenderResult {
  prompt: string;
  tools: Tool[];
}

interface Tool {
  name: string;
  description?: string;
  parameters?: any;
}
```

## Creating a Browser

### Basic Setup

```typescript
import { createBrowser, ROUTES } from '@sker/prompt-renderer';

const browser = createBrowser([
  {
    provide: ROUTES,
    useValue: [
      { path: '/dashboard', component: DashboardComponent, params: {} }
    ]
  }
]);
```

### With Multiple Routes

```typescript
const browser = createBrowser([
  {
    provide: ROUTES,
    useValue: [
      { path: '/dashboard', component: DashboardComponent, params: {} },
      { path: '/users/:id', component: UserProfileComponent, params: {} },
      { path: '/settings', component: SettingsComponent, params: {} }
    ]
  }
]);
```

### With Parent Injector

```typescript
import { createInjector } from '@sker/core';

const parentInjector = createInjector([
  { provide: 'API_KEY', useValue: 'abc123' },
  { provide: 'BASE_URL', useValue: 'https://api.example.com' }
]);

const browser = createBrowser([
  { provide: ROUTES, useValue: [...] }
], parentInjector);
```

## Opening Pages

### Basic Navigation

```typescript
const page = browser.open('prompt:///dashboard');
```

**Important**: URLs must use the `prompt://` protocol with three slashes for absolute paths:
- `prompt:///dashboard` → pathname: `/dashboard`
- `prompt:///users/123` → pathname: `/users/123`

### With Route Parameters

```typescript
// Route: /users/:id
const page = browser.open('prompt:///users/123');

// In component:
function UserProfileComponent({ injector }) {
  const currentRoute = injector.get(CURRENT_ROUTE);
  const userId = currentRoute.params.id; // "123"

  return <div>User ID: {userId}</div>;
}
```

### With Query Parameters

```typescript
const page = browser.open('prompt:///search?q=test&sort=date');

// In component:
function SearchComponent({ injector }) {
  const currentUrl = injector.get(CURRENT_URL);
  const query = currentUrl.searchParams.get('q'); // "test"
  const sort = currentUrl.searchParams.get('sort'); // "date"

  return <div>Search: {query}</div>;
}
```

### With Additional Providers

```typescript
const page = browser.open('prompt:///dashboard', [
  { provide: 'USER_ID', useValue: '123' },
  { provide: 'SESSION', useValue: { token: 'xyz' } }
]);
```

## Page Rendering

### Basic Rendering

```typescript
const page = browser.open('prompt:///dashboard');
const result = page.render();

console.log(result.prompt);
// # Dashboard
// Welcome to your dashboard

console.log(result.tools);
// [{ name: 'refresh', type: 'button', label: 'Refresh' }]
```

### How Rendering Works

The `Page.render()` method:

1. Gets the current route match from the injector
2. Creates a React element from the route component
3. Converts the React element to VNode using `renderReactToVNode()`
4. Renders VNode to markdown using `renderToMarkdown()`
5. Extracts tools from VNode using `extractTools()`

**Implementation** (browser.ts:133-147):
```typescript
render(providers: Provider[] = []): RenderResult {
  const currentRoute = this.parent.get(CURRENT_ROUTE);
  const component = currentRoute.route.component;
  const injector = createInjector([...], this.parent);

  const element = React.createElement(component, { injector });
  const vnode = this.renderReactToVNode(element);
  const prompt = renderToMarkdown(vnode);
  const tools = extractTools(vnode);

  return { prompt, tools };
}
```

### Rendering with Additional Providers

```typescript
const result = page.render([
  { provide: 'USER', useValue: { name: 'Alice', role: 'admin' } },
  { provide: 'TIMESTAMP', useValue: Date.now() }
]);
```

Component receives injector in props:

```typescript
function DashboardComponent({ injector }) {
  const user = injector.get('USER');
  const timestamp = injector.get('TIMESTAMP');

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <p>Last updated: {new Date(timestamp).toLocaleString()}</p>
    </div>
  );
}
```

## Tool Extraction

Tools are automatically extracted from React components based on element attributes.

### Button Tools

```typescript
function MyComponent({ injector }) {
  return (
    <div>
      <button data-action="submit">Submit Form</button>
      <button data-action="cancel" data-params={{ reason: 'user' }}>Cancel</button>
    </div>
  );
}

// Extracted tools:
// [
//   { name: 'submit', type: 'button', label: 'Submit Form' },
//   { name: 'cancel', type: 'button', label: 'Cancel', params: { reason: 'user' } }
// ]
```

### Input Tools

```typescript
function MyComponent({ injector }) {
  return (
    <div>
      <input name="username" placeholder="Enter username" />
      <input name="email" type="email" placeholder="Email address" />
    </div>
  );
}

// Extracted tools:
// [
//   { name: 'username', type: 'input', inputType: 'text', placeholder: 'Enter username' },
//   { name: 'email', type: 'input', inputType: 'email', placeholder: 'Email address' }
// ]
```

## Tool Execution

### Single Tool Execution

```typescript
const page = browser.open('prompt:///form', [
  {
    provide: TOOLS,
    useValue: [
      {
        name: 'submit',
        handler: async (params) => {
          console.log('Form submitted:', params);
          return { success: true };
        }
      }
    ]
  }
]);

const result = await page.execute('submit', { name: 'John', email: 'john@example.com' });
console.log(result);
// { success: true }
```

### Batch Tool Execution

```typescript
const results = await page.executes([
  { name: 'validate', params: { field: 'email' } },
  { name: 'submit', params: { name: 'John' } },
  { name: 'notify', params: { message: 'Submitted' } }
]);

console.log(results);
// [{ valid: true }, { success: true }, { sent: true }]
```

### Error Handling

```typescript
try {
  await page.execute('nonexistent');
} catch (error) {
  console.error(error.message);
  // "Tool not found: nonexistent"
}

try {
  await page.execute('');
} catch (error) {
  console.error(error.message);
  // "Tool name is required"
}
```

## Page Navigation

### Navigating to New URL

```typescript
const page = browser.open('prompt:///users/123');

// Navigate to different URL (returns new Page instance)
const newPage = page.navigate('prompt:///users/456');

console.log(newPage.url.pathname);
// "/users/456"
```

### Accessing Current URL

```typescript
const page = browser.open('prompt:///search?q=test#results');

console.log(page.url.href);       // "prompt:///search?q=test#results"
console.log(page.url.pathname);   // "/search"
console.log(page.url.searchParams.get('q')); // "test"
console.log(page.url.hash);       // "#results"
```

## Component Patterns

### Accessing Route Parameters

```typescript
import { CURRENT_ROUTE } from '@sker/prompt-renderer';

function UserProfileComponent({ injector }) {
  const currentRoute = injector.get(CURRENT_ROUTE);
  const userId = currentRoute.params.id;

  return (
    <div>
      <h1>User Profile</h1>
      <p>User ID: {userId}</p>
    </div>
  );
}
```

### Accessing URL Information

```typescript
import { CURRENT_URL } from '@sker/prompt-renderer';

function SearchComponent({ injector }) {
  const currentUrl = injector.get(CURRENT_URL);
  const query = currentUrl.searchParams.get('q');
  const page = currentUrl.searchParams.get('page') || '1';

  return (
    <div>
      <h1>Search Results</h1>
      <p>Query: {query}</p>
      <p>Page: {page}</p>
    </div>
  );
}
```

### Using Custom Providers

```typescript
function DashboardComponent({ injector }) {
  const apiKey = injector.get('API_KEY');
  const user = injector.get('USER');

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <p>API Key: {apiKey.substring(0, 8)}...</p>
    </div>
  );
}
```

## Complete Example

```typescript
import { createBrowser, ROUTES, TOOLS } from '@sker/prompt-renderer';
import React from 'react';

// Define components
function DashboardComponent({ injector }) {
  const user = injector.get('USER');

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <button data-action="refresh">Refresh Data</button>
    </div>
  );
}

function UserProfileComponent({ injector }) {
  const currentRoute = injector.get(CURRENT_ROUTE);
  const userId = currentRoute.params.id;

  return (
    <div>
      <h1>User Profile</h1>
      <p>User ID: {userId}</p>
      <input name="username" placeholder="Enter username" />
      <button data-action="save">Save Changes</button>
    </div>
  );
}

// Create browser with routes
const browser = createBrowser([
  {
    provide: ROUTES,
    useValue: [
      { path: '/dashboard', component: DashboardComponent, params: {} },
      { path: '/users/:id', component: UserProfileComponent, params: {} }
    ]
  }
]);

// Open dashboard page
const dashboardPage = browser.open('prompt:///dashboard', [
  { provide: 'USER', useValue: { name: 'Alice', role: 'admin' } },
  {
    provide: TOOLS,
    useValue: [
      {
        name: 'refresh',
        handler: async () => {
          console.log('Refreshing data...');
          return { timestamp: Date.now() };
        }
      }
    ]
  }
]);

// Render page
const dashboardResult = dashboardPage.render();

console.log(dashboardResult.prompt);
// # Dashboard
//
// Welcome, Alice
//
// [Refresh Data]

console.log(dashboardResult.tools);
// [{ name: 'refresh', type: 'button', label: 'Refresh Data' }]

// Execute tool
const refreshResult = await dashboardPage.execute('refresh');
console.log(refreshResult);
// { timestamp: 1706659200000 }

// Navigate to user profile
const userPage = browser.open('prompt:///users/123', [
  {
    provide: TOOLS,
    useValue: [
      {
        name: 'username',
        handler: async (params) => {
          console.log('Username input:', params);
          return { saved: true };
        }
      },
      {
        name: 'save',
        handler: async () => {
          console.log('Saving changes...');
          return { success: true };
        }
      }
    ]
  }
]);

const userResult = userPage.render();

console.log(userResult.prompt);
// # User Profile
//
// User ID: 123
//
// [Input: Enter username]
//
// [Save Changes]

console.log(userResult.tools);
// [
//   { name: 'username', type: 'input', placeholder: 'Enter username' },
//   { name: 'save', type: 'button', label: 'Save Changes' }
// ]

// Execute input tool
await userPage.execute('username', 'john_doe');
// Username input: john_doe

// Execute button tool
await userPage.execute('save');
// Saving changes...
```

## Error Handling

### Invalid URL Format

```typescript
try {
  browser.open('http://example.com'); // Wrong protocol
} catch (error) {
  console.error(error.message);
  // "Invalid URL format"
}

try {
  browser.open(''); // Empty URL
} catch (error) {
  console.error(error.message);
  // "Invalid URL format"
}
```

### Route Not Found

```typescript
const page = browser.open('prompt:///nonexistent');
const result = page.render();

// currentRoute will be null if no route matches
// Handle this in your component or check before rendering
```

### Tool Not Found

```typescript
try {
  await page.execute('nonexistent');
} catch (error) {
  console.error(error.message);
  // "Tool not found: nonexistent"
}
```

### Missing Tool Name

```typescript
try {
  await page.execute('');
} catch (error) {
  console.error(error.message);
  // "Tool name is required"
}
```

## Injection Tokens

Available injection tokens:

```typescript
import {
  ROUTES,           // InjectionToken<Route[]>
  CURRENT_URL,      // InjectionToken<PromptURL>
  CURRENT_ROUTE,    // InjectionToken<RouteMatch>
  CURRENT_PAGE,     // InjectionToken<Page>
  COMPONENT,        // InjectionToken<React.FunctionComponent>
  TOOLS             // InjectionToken<RouteTool[]>
} from '@sker/prompt-renderer';
```

## Key Implementation Details

### Route Matching (browser.ts:70-79)

Routes are matched using path patterns with parameter extraction:
- `/users/:id` matches `/users/123` with `params: { id: '123' }`
- Patterns are split by `/` and compared part by part
- Parts starting with `:` are treated as parameters

### React to VNode Conversion (browser.ts:149-172)

The `renderReactToVNode()` method recursively converts React elements:
1. Strings/numbers → TextNode
2. String types (e.g., 'div') → ElementNode with children
3. Function types → Call function and recurse on result
4. Uses `React.Children.toArray()` to handle children

### Tool Extraction

Tools are extracted from VNodes based on:
- `<button data-action="name">` → Button tool
- `<input name="name">` → Input tool
- Recursively searches through all children

## Best Practices

1. **Always provide injector to components**: Components receive `{ injector }` as props
2. **Use injection tokens for configuration**: Define tokens for routes, tools, and custom data
3. **Handle null routes**: Check if `CURRENT_ROUTE` is null when route doesn't match
4. **Use proper URL format**: Always use `prompt:///path` with three slashes
5. **Extract tools automatically**: Use `data-action` and `name` attributes for tool extraction
6. **Provide tools via DI**: Use `TOOLS` injection token to register tool handlers
7. **Keep components pure**: Components should only render based on injected dependencies
