# Router Usage

## Overview

The router system provides URL-based navigation with pattern matching, dynamic parameters, and history management.

## URL Parsing and Building

### Parsing URLs

```typescript
import { parseUrl } from '@sker/prompt-renderer';

const url = parseUrl('prompt://app/users/123?sort=name&filter=active#section');

console.log(url);
// {
//   protocol: 'prompt:',
//   pathname: '/users/123',
//   query: { sort: 'name', filter: 'active' },
//   hash: 'section'
// }
```

### Building URLs

```typescript
import { buildUrl } from '@sker/prompt-renderer';

const url = buildUrl({
  pathname: '/users/123',
  query: { sort: 'name', filter: 'active' },
  hash: 'section'
});

console.log(url);
// "prompt://app/users/123?sort=name&filter=active#section"
```

### Extracting Parameters

```typescript
import { extractParams } from '@sker/prompt-renderer';

const params = extractParams('/users/:id/posts/:postId', '/users/123/posts/456');

console.log(params);
// { id: '123', postId: '456' }
```

## Route Matching

### Static Routes

```typescript
import { matchRoute } from '@sker/prompt-renderer';

const match = matchRoute('/dashboard', '/dashboard');
// { matched: true, params: {} }

const noMatch = matchRoute('/dashboard', '/settings');
// { matched: false }
```

### Dynamic Parameters

```typescript
// Single parameter
matchRoute('/users/:id', '/users/123');
// { matched: true, params: { id: '123' } }

// Multiple parameters
matchRoute('/users/:userId/posts/:postId', '/users/123/posts/456');
// { matched: true, params: { userId: '123', postId: '456' } }
```

### Optional Parameters

```typescript
// Optional parameter present
matchRoute('/users/:id?', '/users/123');
// { matched: true, params: { id: '123' } }

// Optional parameter absent
matchRoute('/users/:id?', '/users');
// { matched: true, params: {} }
```

### Wildcard Routes

```typescript
// Wildcard matches everything after prefix
matchRoute('/docs/*', '/docs/api/reference');
// { matched: true, wildcard: 'api/reference', params: {} }

matchRoute('/files/*', '/files/images/photo.jpg');
// { matched: true, wildcard: 'images/photo.jpg', params: {} }
```

## Route Ranking

Routes are ranked by specificity to ensure correct matching order:

```typescript
import { rankRoutes } from '@sker/prompt-renderer';

const routes = [
  '/users/*',           // Least specific
  '/users/:id',         // More specific
  '/users/profile',     // Most specific
  '/users/:id/posts'    // Longer path
];

const ranked = rankRoutes(routes);
// [
//   '/users/:id/posts',  // Longest first
//   '/users/profile',    // Static segments prioritized
//   '/users/:id',        // Dynamic parameters
//   '/users/*'           // Wildcards last
// ]
```

**Ranking Rules**:
1. Longer paths rank higher
2. Static segments beat dynamic parameters
3. Dynamic parameters beat wildcards
4. Equal specificity maintains original order

## Pattern Compilation

Convert route patterns to regular expressions:

```typescript
import { compilePattern } from '@sker/prompt-renderer';

const regex = compilePattern('/users/:id/posts/:postId');
// /^\/users\/([^/]+)\/posts\/([^/]+)$/

regex.test('/users/123/posts/456'); // true
regex.test('/users/123'); // false
```

## Navigation History

### Creating History

```typescript
import { createHistory } from '@sker/prompt-renderer';

const history = createHistory();
```

### Navigation Methods

```typescript
// Push new location
history.push('prompt://app/users/123');

// Replace current location
history.replace('prompt://app/users/456');

// Go back
history.back();

// Go forward
history.forward();

// Go to specific offset
history.go(-2); // Back 2 steps
history.go(1);  // Forward 1 step
```

### History State

```typescript
// Current location
console.log(history.location);
// { pathname: '/users/123', query: {}, hash: undefined }

// Current index
console.log(history.index); // 0

// History length
console.log(history.length); // 1

// Check navigation availability
console.log(history.canGoBack());    // false
console.log(history.canGoForward()); // false
```

### Listening to Changes

```typescript
const unlisten = history.listen((update) => {
  console.log('Action:', update.action); // 'PUSH' | 'REPLACE' | 'POP'
  console.log('Location:', update.location);
});

// Later: stop listening
unlisten();
```

## React Hooks

### useRouter

```typescript
import { useRouter } from '@sker/prompt-renderer';

function Component() {
  const router = useRouter();

  return (
    <button onClick={() => router.navigate('/dashboard')}>
      Go to Dashboard
    </button>
  );
}
```

### useParams

```typescript
import { useParams } from '@sker/prompt-renderer';

function UserProfile() {
  const { id } = useParams();
  return <div>User ID: {id}</div>;
}
```

### useLocation

```typescript
import { useLocation } from '@sker/prompt-renderer';

function Component() {
  const location = useLocation();
  return <div>Current path: {location.pathname}</div>;
}
```

### useNavigate

```typescript
import { useNavigate } from '@sker/prompt-renderer';

function Component() {
  const navigate = useNavigate();

  return (
    <>
      <button onClick={() => navigate('/dashboard')}>Dashboard</button>
      <button onClick={() => navigate('/settings', { replace: true })}>
        Settings (Replace)
      </button>
      <button onClick={() => navigate('../parent')}>Up One Level</button>
    </>
  );
}
```

### useSearchParams

```typescript
import { useSearchParams } from '@sker/prompt-renderer';

function SearchComponent() {
  const [params, setParams] = useSearchParams();

  return (
    <>
      <div>Sort: {params.sort}</div>
      <button onClick={() => setParams({ sort: 'name' })}>
        Sort by Name
      </button>
    </>
  );
}
```

## Complete Example

```typescript
import { createHistory, matchRoute, rankRoutes } from '@sker/prompt-renderer';

// Define routes
const routes = [
  '/dashboard',
  '/users/:id',
  '/users/:id/posts/:postId',
  '/settings/*'
];

// Rank routes for matching
const rankedRoutes = rankRoutes(routes);

// Create history
const history = createHistory();

// Listen to navigation
history.listen((update) => {
  console.log(`Navigation: ${update.action} to ${update.location.pathname}`);

  // Find matching route
  for (const route of rankedRoutes) {
    const match = matchRoute(route, update.location.pathname);
    if (match.matched) {
      console.log('Matched route:', route);
      console.log('Params:', match.params);
      break;
    }
  }
});

// Navigate
history.push('prompt://app/users/123');
// Navigation: PUSH to /users/123
// Matched route: /users/:id
// Params: { id: '123' }

history.push('prompt://app/users/123/posts/456');
// Navigation: PUSH to /users/123/posts/456
// Matched route: /users/:id/posts/:postId
// Params: { id: '123', postId: '456' }
```
