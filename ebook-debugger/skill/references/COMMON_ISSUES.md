# Common Electron + React Issues

This document describes common issues in Electron + React applications and their solutions.

## 1. Memory Leaks

### Symptoms
- Application becomes slow over time
- High memory usage in Task Manager
- Event listeners stacking

### Common Causes
- Event listeners not removed on unmount
- Intervals/timeouts not cleared
- References held in closures

### Solutions
```javascript
// ❌ Bad - listener never removed
useEffect(() => {
  rendition.on('relocated', handler)
}, [])

// ✅ Good - listener removed on cleanup
useEffect(() => {
  rendition.on('relocated', handler)
  return () => {
    rendition.off('relocated', handler)
  }
}, [rendition])
```

## 2. Race Conditions

### Symptoms
- Intermittent failures
- "Cannot read property of undefined" errors
- State not updating as expected

### Common Causes
- Async operations completing out of order
- State updates happening before component mounts
- Multiple simultaneous operations on same resource

### Solutions
```javascript
// ✅ Use ref to track handler
const handlerRef = useRef(null)

useEffect(() => {
  handlerRef.current = handler
  rendition.on('relocated', handlerRef.current)
  return () => {
    if (handlerRef.current) {
      rendition.off('relocated', handlerRef.current)
    }
  }
}, [rendition])
```

## 3. IPC Communication Failures

### Symptoms
- "window.electronAPI is not defined" errors
- IPC handlers not found
- Functions hang without response

### Common Causes
- Preload script not loaded
- IPC handler registered after renderer loads
- Context bridge not configured correctly

### Solutions
```javascript
// ✅ Always check if API is available
if (window.electronAPI?.someMethod) {
  await window.electronAPI.someMethod()
} else {
  console.warn('ElectronAPI not available')
}

// ✅ Handle errors gracefully
try {
  const result = await window.electronAPI.someMethod()
} catch (error) {
  console.error('IPC error:', error)
}
```

## 4. LocalForage/IndexedDB Issues

### Symptoms
- Data not persisting
- Old data appearing after updates
- "clear()" destroying entire database

### Common Causes
- Using `clear()` instead of `removeItem()`
- Not waiting for async operations
- Database corrupted by improper operations

### Solutions
```javascript
// ❌ Bad - destroys entire database
await localforage.clear()

// ✅ Good - removes only specific data
await localforage.removeItem('books')

// ✅ Always handle async properly
await localforage.getItem('books').then(data => {
  // Process data
}).catch(error => {
  console.error('LocalForage error:', error)
})
```

## 5. React Rendering Issues

### Symptoms
- Component not updating
- Stale props showing
- Too many re-renders warnings

### Common Causes
- Missing dependencies in useEffect
- Incorrect state update patterns
- Unnecessary re-renders from prop changes

### Solutions
```javascript
// ✅ Correct dependencies
useEffect(() => {
  // Effect code
}, [dependency1, dependency2, dependency3]) // Include all used values

// ✅ Functional state updates for derived state
const [items, setItems] = useState([])

// ❌ Bad - creates new array reference
setItems([...items, newItem])

// ✅ Good - uses previous state
setItems(prev => [...prev, newItem])
```

## 6. Electron Protocol Issues

### Symptoms
- Files not loading from app:// protocol
- Assets returning 404
- CORS errors

### Common Causes
- Protocol handler not registered
- Incorrect path resolution
- CORS headers missing for http:// requests

### Solutions
```javascript
// ✅ Register protocol before app ready
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { secure: true, standard: true, supportFetchAPI: true }
}])

// ✅ Handle CORS for local server
res.setHeader('Access-Control-Allow-Origin', '*')
res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
```

## 7. epubjs Specific Issues

### Symptoms
- Book not loading
- Pages blank
- Styling not applying
- Navigation not working

### Common Causes
- Viewer ref null during render
- Book engine not destroyed before loading new one
- Styles applied before content ready
- Location generation timing issues

### Solutions
```javascript
// ✅ Check viewer ref before rendering
if (!viewerRef.current) {
  console.error('Viewer not ready')
  return
}

// ✅ Destroy previous book engine
if (bookEngine) {
  try {
    bookEngine.destroy()
  } catch (e) {
    console.warn('Destroy failed:', e)
  }
  setBookEngine(null)
}

// ✅ Apply styles after content ready
useEffect(() => {
  const contents = rendition?.getContents()
  if (contents && contents.length > 0) {
    contents.forEach(content => {
      content.addStylesheetRules(rules)
    })
  }
}, [rendition, currentTheme, readingFont])
```
