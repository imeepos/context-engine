---
name: ink-patterns
description: Ink CLI framework patterns for building React-based terminal UIs. Use when working with Ink framework for CLI development, building terminal interfaces with React, or need guidance on Ink components (Box, Text, Static), hooks (useInput, useFocus, useStdout), layout patterns, performance optimization, or understanding Ink's internal architecture.
version: 2.0.0
source: ink-repository-source-code-analysis
repository: vadimdemedes/ink
---

# Ink Patterns - React for CLI

Ink is a React renderer for building command-line interfaces using Yoga (Flexbox layout engine) to create terminal UIs with familiar React patterns.

## Quick Reference

### Core Components
- `<Box>` - Flexbox layout container (like `<div style="display: flex">`)
- `<Text>` - Text rendering with styling (color, bold, italic, etc.)
- `<Static>` - Permanent output (logs, completed tasks)
- `<Spacer>` - Flexible space filler
- `<Newline>` - Line breaks
- `<Transform>` - Text transformation

### Core Hooks
- `useInput(handler, options)` - Keyboard input handling
- `useFocus(options)` - Focus management
- `useFocusManager()` - Programmatic focus control
- `useApp()` - App lifecycle (exit)
- `useStdin/useStdout/useStderr()` - Stream access

### Render Options
```tsx
render(<App />, {
  maxFps: 30,                    // Frame rate limit
  incrementalRendering: true,    // Only update changed lines
  isScreenReaderEnabled: false,  // Screen reader support
  onRender: ({renderTime}) => {} // Performance monitoring
});
```

## Documentation Structure

This skill is organized into three reference files for efficient context usage:

### 1. Usage Guide (使用指南)
**File:** [references/usage-guide.md](references/usage-guide.md)

Read this when you need to:
- Render basic Ink applications
- Use Flexbox layout patterns
- Handle user input
- Implement static output
- Manage focus
- Support screen readers
- Optimize performance

### 2. Development Manual (二次开发手册)
**File:** [references/development-manual.md](references/development-manual.md)

Read this when you need to:
- Build custom components
- Use Context patterns
- Create custom hooks
- Write tests with ink-testing-library
- Build custom renderers
- Integrate external processes

### 3. Implementation Principles (实现原理解析)
**File:** [references/implementation-principles.md](references/implementation-principles.md)

Read this when you need to understand:
- React Reconciler integration
- Virtual DOM structure
- Flexbox layout engine
- Render pipeline
- Input handling mechanism
- Performance optimization
- Screen reader support

## Best Practices

### Component Design
- ✅ All text must be wrapped in `<Text>`
- ✅ Use `<Box>` for layout
- ✅ Use Flexbox properties
- ❌ Never nest `<Box>` inside `<Text>`

### Performance
- ✅ Use `maxFps` to limit render frequency
- ✅ Enable `incrementalRendering` to reduce flicker
- ✅ Use `<Static>` for unchanging content
- ✅ Avoid creating new objects/functions in render

### User Experience
- ✅ Provide clear keyboard shortcuts
- ✅ Use `useFocus` for focus management
- ✅ Support Ctrl+C exit (default enabled)
- ✅ Add ARIA attributes for screen readers

### Testing
- ✅ Use `ink-testing-library`
- ✅ Test user input interactions
- ✅ Verify async updates
- ✅ Check output format

### Debugging
- ✅ Use `debug: true` to see all frames
- ✅ Set `DEV=true` for React DevTools
- ✅ Use `onRender` callback for performance
- ✅ Handle `stdout.columns` undefined

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Text not displaying | Text not wrapped in `<Text>` | `<Text>{content}</Text>` |
| Layout broken | Incorrect Flexbox properties | Check `flexDirection`, `justifyContent`, `alignItems` |
| Input not working | Raw mode not enabled or conflicts | Use `isActive` option |
| Performance issues | Render frequency too high | Lower `maxFps` or enable `incrementalRendering` |
| Terminal size issues | `stdout.columns` undefined | Use `terminal-size` as fallback |

## References

- **Official Docs:** https://github.com/vadimdemedes/ink
- **Examples:** `examples/` directory in repo
- **Testing Library:** https://github.com/vadimdemedes/ink-testing-library
- **Yoga Layout:** https://github.com/facebook/yoga
- **React Reconciler:** https://github.com/facebook/react/tree/main/packages/react-reconciler

---

**Version:** Ink 6.6.0
**Node Requirement:** >=20
**React Version:** >=19.0.0
