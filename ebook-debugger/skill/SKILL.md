---
name: electron-app-debug
description: Comprehensive debugging toolkit for Electron + React applications. Use when Claude needs to diagnose, test, or debug Electron apps with React frontend, especially ebook readers using epubjs. Includes tools for console log capture, IPC debugging, state inspection, and automated testing workflows.
---

# Electron + React App Debugger

This skill provides comprehensive debugging capabilities for Electron applications with React frontends, specifically designed for epub-based ebook readers.

## Quick Start

### Manual Debugging Workflow

1. **Launch the app** with developer tools enabled
2. **Capture console logs** for JavaScript errors
3. **Inspect application state** using React DevTools
4. **Test specific features** with reproduction steps
5. **Analyze errors** with context from codebase

See [COMMON_ISSUES.md](references/COMMON_ISSUES.md) for typical Electron+React bugs and their solutions.

## Debugging Tools

### 1. Console Log Capture

Use DevTools console to catch:
- JavaScript runtime errors
- React component errors
- epubjs rendering issues
- Network failures (fetch, WebSocket, IPC)

**Key patterns to watch:**
```javascript
// epubjs errors
TypeError: Cannot read properties of undefined (reading 'destroy')
Uncaught Error: XML parsing failed

// React errors
Warning: Can't perform a React state update on an unmounted component
Error: Too many re-renders. React limits the number of renders

// IPC errors
Error: IPC handler 'get-book-server-port' not registered
Error: window.electronAPI is not defined
```

### 2. IPC Communication Debugging

Test IPC handlers by checking:
```javascript
// In renderer (DevTools console)
console.log('electronAPI available:', !!window.electronAPI)
window.electronAPI?.getBookServerPort().then(port => {
  console.log('Server port:', port)
}).catch(err => {
  console.error('IPC error:', err)
})
```

Verify handlers are registered in main process:
```javascript
// In main.cjs
ipcMain.handle('get-book-server-port', () => serverPort)
```

### 3. State Inspection

Use React DevTools Components tab to inspect:
- Component props and state
- Hook values (useState, useEffect, useRef)
- Context values
- Rendering issues

Common state issues:
- Stale closures
- Missing dependencies in useEffect
- Incorrect state updates
- Race conditions in async operations

### 4. LocalForage Debugging

Check IndexedDB/LocalForage operations:
```javascript
// In DevTools console
localforage.getItem('books').then(books => {
  console.log('Library:', books)
}).catch(err => {
  console.error('LocalForage error:', err)
})

// Check all keys
localforage.keys().then(keys => {
  console.log('Stored keys:', keys)
})
```

### 5. epubjs Debugging

Common epubjs issues and solutions:

**Issue: Book won't load**
- Check if viewer ref is null when rendering starts
- Verify epubjs version compatibility
- Check for CORS errors when loading from server

**Issue: Memory leaks**
- Always call `book.destroy()` before loading new book
- Remove event listeners: `rendition.off('relocated', handler)`
- Cleanup selections and annotations

**Issue: Styling not applying**
- Check if rendition.contents() is ready
- Verify CSS rules have `!important` flag
- Wait for location change before applying styles

## Automated Testing

Use [scripts/test_reset_bug.py](scripts/test_reset_bug.py) to automate testing the reset functionality.

Use [scripts/test_epub_loading.py](scripts/test_epub_loading.py) to test book loading with various EPUB files.

## Common Debugging Patterns

### Pattern 1: Reproduction Steps

When reporting or fixing bugs:
1. Clear application data
2. Reproduce bug with exact steps
3. Capture console output
4. Note application state before/after
5. Verify fix resolves issue

### Pattern 2: Isolating Components

If React component has issues:
1. Test component in isolation (create minimal reproduction)
2. Check props passed to component
3. Verify state updates are correct
4. Check useEffect dependencies
5. Remove side effects to narrow down issue

### Pattern 3: Testing IPC

For Electron IPC issues:
1. Verify preload script exposes API
2. Check main process registers handler
3. Test with different data types
4. Verify async/error handling
5. Check for race conditions in startup

## Known Issues in Lumina Reader

See [LUMINA_BUGS.md](references/LUMINA_BUGS.md) for documented bugs, their root causes, and verified fixes.

## Best Practices

1. **Always check `window.electronAPI`** before calling methods (graceful degradation in browser dev mode)
2. **Clean up event listeners** when components unmount or books change
3. **Use refs for persistent values** across renders (e.g., handler refs for event cleanup)
4. **Validate user input** before async operations (file uploads, book IDs)
5. **Test with both dev mode and production build** (behavior can differ)
6. **Clear console** between tests to avoid confusion
7. **Use try/catch** around all async operations with meaningful error logging
8. **Check IndexedDB** using browser DevTools Application tab
