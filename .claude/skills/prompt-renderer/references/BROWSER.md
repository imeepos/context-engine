# Browser & Page Usage

## Overview

The browser and page system provides application-level management for prompt-based interfaces with routing, rendering, and tool execution.

## Creating a Browser

### Basic Setup

```typescript
import { createBrowser } from '@sker/prompt-renderer';

const browser = createBrowser({
  routes: [
    {
      path: '/dashboard',
      component: DashboardComponent
    }
  ]
});
```

### With Tools

```typescript
const browser = createBrowser({
  routes: [
    {
      path: '/users/:id',
      component: UserProfile,
      tools: [
        {
          name: 'updateUser',
          handler: async (params) => {
            // Update user logic
            return { success: true };
          },
          description: 'Update user information',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      ]
    }
  ]
});
```

### With Context

```typescript
const browser = createBrowser({
  routes: [...],
  context: {
    cookies: { sessionId: 'abc123' },
    localStorage: { theme: 'dark' }
  }
});
```

## Opening Pages

### Basic Navigation

```typescript
const page = browser.open('prompt://app/dashboard');
```

### With Parameters

```typescript
const page = browser.open('prompt://app/users/123');
// Route: /users/:id
// Params: { id: '123' }
```

### With Query Parameters

```typescript
const page = browser.open('prompt://app/search?q=test&sort=date');
// Query: { q: 'test', sort: 'date' }
```

### With Hash

```typescript
const page = browser.open('prompt://app/docs#section-2');
// Hash: 'section-2'
```

## Page Rendering

### Basic Rendering

```typescript
const page = browser.open('prompt://app/dashboard');
const result = page.render();

console.log(result);
// {
//   prompt: "# Dashboard\n\nWelcome to your dashboard",
//   tools: [
//     { name: 'refresh', description: 'Refresh data', parameters: {...} }
//   ]
// }
```

### Rendering with Context

```typescript
const result = page.render({
  user: { name: 'John', role: 'admin' },
  timestamp: Date.now()
});
```

Component receives context in props:

```typescript
function DashboardComponent({ params, searchParams, user, timestamp }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}</p>
    </div>
  );
}
```

## Tool Execution

### Single Tool Execution

```typescript
const page = browser.open('prompt://app/users/123');

// Execute a tool
const result = await page.execute('updateUser', {
  name: 'John Doe',
  email: 'john@example.com'
});

console.log(result);
// { success: true }
```

### Batch Tool Execution

```typescript
const results = await page.executes([
  { name: 'updateUser', params: { name: 'John' } },
  { name: 'refreshData', params: {} },
  { name: 'sendNotification', params: { message: 'Updated' } }
]);

console.log(results);
// [{ success: true }, { data: [...] }, { sent: true }]
```

### Error Handling

```typescript
try {
  await page.execute('nonexistentTool');
} catch (error) {
  console.error(error.message);
  // "Tool not found: nonexistentTool"
}

try {
  await page.execute(''); // Empty tool name
} catch (error) {
  console.error(error.message);
  // "Tool name is required"
}
```

## Page Navigation

### Navigating Within Page

```typescript
const page = browser.open('prompt://app/users/123');

// Navigate to different URL
page.navigate('prompt://app/users/456');

console.log(page.url.pathname);
// "/users/456"
```

### Subscribing to Navigation

```typescript
const unsubscribe = page.subscribe((url) => {
  console.log('Navigated to:', url.pathname);
  console.log('Query params:', url.searchParams);
  console.log('Hash:', url.hash);
});

page.navigate('prompt://app/dashboard');
// Navigated to: /dashboard

// Later: unsubscribe
unsubscribe();
```

## Context Management

### Browser-Level Context

```typescript
// Set context for all pages
browser.setContext({
  cookies: { sessionId: 'xyz789' },
  localStorage: { theme: 'light' }
});

const page = browser.open('prompt://app/dashboard');
console.log(page.context);
// { cookies: { sessionId: 'xyz789' }, localStorage: { theme: 'light' } }
```

### Page-Level Context

```typescript
const page = browser.open('prompt://app/dashboard');

// Update context for this page only
page.setContext({
  cookies: { userId: '123' }
});

console.log(page.context);
// {
//   cookies: { sessionId: 'xyz789', userId: '123' },
//   localStorage: { theme: 'light' }
// }
```

## Route Components

### Component Structure

```typescript
interface ComponentProps {
  params: Record<string, string>;      // Route parameters
  searchParams: URLSearchParams;       // Query parameters
  [key: string]: any;                  // Custom context from render()
}

function MyComponent(props: ComponentProps) {
  const { params, searchParams } = props;

  return (
    <div>
      <h1>User {params.id}</h1>
      <p>Sort: {searchParams.get('sort')}</p>
    </div>
  );
}
```

### Accessing Context

```typescript
function DashboardComponent({ params, searchParams, ...context }) {
  // Access browser context
  const { cookies, localStorage } = context;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Session: {cookies?.sessionId}</p>
      <p>Theme: {localStorage?.theme}</p>
    </div>
  );
}
```

## Complete Example

```typescript
import { createBrowser } from '@sker/prompt-renderer';

// Define components
function DashboardComponent({ params, user }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <button data-action="refresh">Refresh</button>
    </div>
  );
}

function UserProfile({ params }) {
  return (
    <div>
      <h1>User Profile</h1>
      <p>User ID: {params.id}</p>
      <input name="username" placeholder="Enter username" />
    </div>
  );
}

// Create browser
const browser = createBrowser({
  routes: [
    {
      path: '/dashboard',
      component: DashboardComponent,
      tools: [
        {
          name: 'refresh',
          handler: async () => {
            console.log('Refreshing data...');
            return { timestamp: Date.now() };
          },
          description: 'Refresh dashboard data'
        }
      ]
    },
    {
      path: '/users/:id',
      component: UserProfile,
      tools: [
        {
          name: 'username',
          handler: async (params) => {
            console.log('Username submitted:', params);
            return { saved: true };
          },
          description: 'Submit username'
        }
      ]
    }
  ],
  context: {
    cookies: { sessionId: 'abc123' }
  }
});

// Open dashboard page
const dashboardPage = browser.open('prompt://app/dashboard');

// Render with user context
const result = dashboardPage.render({
  user: { name: 'Alice', role: 'admin' }
});

console.log(result.prompt);
// # Dashboard
//
// Welcome, Alice
//
// [Refresh]

console.log(result.tools);
// [{ name: 'refresh', description: 'Refresh dashboard data' }]

// Execute tool
const refreshResult = await dashboardPage.execute('refresh');
console.log(refreshResult);
// { timestamp: 1234567890 }

// Navigate to user profile
const userPage = browser.open('prompt://app/users/123');
const userResult = userPage.render();

console.log(userResult.prompt);
// # User Profile
//
// User ID: 123
//
// [Input: Enter username]

// Subscribe to navigation
const unsubscribe = userPage.subscribe((url) => {
  console.log('URL changed:', url.pathname);
});

userPage.navigate('prompt://app/users/456');
// URL changed: /users/456

unsubscribe();
```

## Error Handling

### Invalid URLs

```typescript
try {
  browser.open('http://example.com'); // Wrong protocol
} catch (error) {
  console.error(error.message);
  // "Invalid URL format"
}
```

### Route Not Found

```typescript
try {
  browser.open('prompt://app/nonexistent');
} catch (error) {
  console.error(error.message);
  // "Route not found"
}
```

### Missing Component

```typescript
const browser = createBrowser({
  routes: [
    { path: '/broken', component: null } // Invalid
  ]
});

try {
  browser.open('prompt://app/broken');
} catch (error) {
  console.error(error.message);
  // "Route component is required"
}
```
