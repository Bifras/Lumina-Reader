# Lumina Reader - Agent Development Guide

## Build, Lint, and Test Commands

```bash
# Development (Vite dev server on localhost:5173)
npm run dev

# Build for production (creates /dist folder)
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview

# Full Electron development (Vite + Electron)
npm run electron:dev

# Build Electron app
npm run electron:build
```

**No test suite currently configured.** When adding tests, set up a test framework (e.g., Vitest) and update this guide.

---

## Project Architecture

This is an **Electron + React** desktop application for reading EPUB files.

### Key Design Patterns
- **Frontend**: React 19 with Vite, Framer Motion for animations
- **Backend**: Electron main process handles file I/O via IPC
- **Data Persistence**: 
  - Book metadata stored in IndexedDB via `localforage`
  - EPUB files stored in filesystem at `userData/books/`
  - Local HTTP server (127.0.0.1) serves EPUB files to frontend
- **EPUB Rendering**: `epubjs` library with customizable themes/fonts

### File Structure
```
src/
├── App.jsx          # Main React component (library + reader views)
├── main.jsx         # React entry point
├── db.js           # Data access layer (localforage + Electron IPC)
└── components/     # Reusable React components
electron/
├── main.cjs        # Electron main process (IPC handlers, HTTP server)
└── preload.cjs     # Context bridge for secure IPC communication
```

---

## Code Style Guidelines

### Imports
- **Order**: External libs → Internal modules → CSS (if any)
- Use named imports for lucide-react icons: `import { X, CheckCircle } from 'lucide-react'`
- Default exports from local files: `import App from './App.jsx'`

```javascript
// Good
import { useState, useEffect } from 'react'
import ePub from 'epubjs'
import { AnimatePresence, motion } from 'framer-motion'
import { saveBookMetadata, getLibrary } from './db'
import './App.css'
```

### Component Structure
- Functional components with hooks
- **Define constants at module level** when they don't depend on component state (e.g., `THEMES`, `fontOptions`)
- Define component-specific constants inside component
- Extract complex handlers into functions within component
- Prefer early returns for conditional rendering

```javascript
const Component = () => {
  const [state, setState] = useState(null)

  const handleClick = () => { /* ... */ }

  if (loading) return <Loader />

  return (
    <div>...</div>
  )
}
```

### State Management
- Use `useState` for local component state
- Use `useRef` for DOM nodes and values that persist across renders
- Use `useEffect` for side effects (always include dependency array)
- **Wrap functions in `useCallback`** when they're used as dependencies in other hooks (prevents infinite re-renders)

### Error Handling
- **Always** wrap async operations in try/catch
- Log errors with descriptive context: `console.error("[PREFIX] Message:", error)`
- Use `addToast()` for user-facing error messages
- In Electron IPC handlers, throw errors to propagate to renderer

```javascript
try {
  await riskyOperation()
} catch (error) {
  console.error("[ERROR] Operation failed:", error)
  addToast("User-friendly message", "error", "Title")
}
```

### IPC Communication (Electron)
- Main process (main.cjs): Use `ipcMain.handle()` for async handlers
- Preload (preload.cjs): Expose via `contextBridge.exposeInMainWorld()`
- Renderer (React): Access via `window.electronAPI.methodName()`

**Critical**: Always check `window.electronAPI` exists before calling methods (fails gracefully in browser dev mode).

```javascript
if (window.electronAPI?.saveBookFile) {
  await window.electronAPI.saveBookFile(id, buffer)
}
```

**Naming consistency**: IPC handler names in main.cjs must match method names exposed in preload.cjs (e.g., `delete-book-file` → `deleteBookFile`).

### Naming Conventions
- **Components**: PascalCase (e.g., `Toast`, `LibraryView`)
- **Functions/Variables**: camelCase (e.g., `loadBook`, `activeBook`)
- **Constants**: UPPER_SNAKE_CASE or PascalCase (e.g., `THEMES`, `fontOptions`)
- **Event Handlers**: `handle` prefix (e.g., `handleFileUpload`, `handleReturnToLibrary`)
- **Async functions**: Use `async/await` consistently

### TypeScript/Types
- Project uses **JavaScript** (no TypeScript)
- Type hints in comments are acceptable for clarity
- No JSDoc required but encouraged for complex functions

### Styling
- Use **Tailwind-style class names** for common patterns
- Prefer inline styles for dynamic values: `style={{ width: '100%' }}`
- Use CSS variables from `:root` in index.css
- **No comments in JSX** unless explaining complex logic

```javascript
// Good
<div style={{ width: '100%', background: 'var(--bg-cream)' }} />

// Avoid inline CSS classes
<div className="custom-container" />
```

### Framer Motion
- Use `AnimatePresence` for enter/exit animations
- Use `motion` component extensively in JSX: `<motion.div>`, `<motion.button>`, etc.
- Keep animation config minimal: `initial`, `animate`, `exit`
- Use spring transitions for UI elements: `transition={{ type: 'spring', damping: 25, stiffness: 200 }}`
- **Note**: `motion` may appear unused in linter because JSX usage is't detected. Use `// eslint-disable-next-line no-unused-vars` if needed.

### Localforage Patterns
- Configure once at module level
- Always return the updated data from mutations
- Use `getItem()` → modify → `setItem()` pattern for updates

```javascript
export const updateProgress = async (id, cfi, progress) => {
  const library = await getLibrary()
  const index = library.findIndex(b => b.id === id)
  if (index !== -1) {
    library[index].cfi = cfi
    library[index].progress = progress
    await localforage.setItem('books', library)
  }
}
```

---

## ESLint Configuration
- Uses flat config with React plugins
- `no-unused-vars`: Allows uppercase regex pattern for constants
- Ignores `dist/` and `.skills/` directories

Run `npm run lint` before committing changes. Fix linting errors manually or use your editor's auto-fix.

---

## Critical Gotchas

1. **File Protocol Security**: Electron app uses `app://` protocol for assets. Use relative paths in Vite config: `base: './'`

2. **CORS for Book Server**: The local HTTP server for EPUB files must set `Access-Control-Allow-Origin: *` because app:// protocol fetches from http://127.0.0.1

3. **EPUB Loading**: Always destroy previous book engine before loading new books to prevent memory leaks

4. **Viewer Ref**: Check `viewerRef.current` exists before rendering EPUB. It may be null during initial render.
   - Provide user-friendly error messages if viewer isn't ready
   - Consider retry logic with timeout for slow-to-render elements
   - Early return with cleanup (`setIsLoading(false)`) if check fails

5. **Browser Dev Mode**: In `npm run dev`, code runs in browser (no Electron APIs). Always check for `window.electronAPI`.
   - Use optional chaining: `window.electronAPI?.method()`
   - This prevents crashes when Electron APIs aren't available
   - Test in browser mode first before running full Electron app

---

## Common Issues & Troubleshooting

### Viewer Ref is Null
- **Scenario**: `viewerRef.current` is accessed before the DOM element is mounted.
- **Fix**: Use `useEffect` or `waitForViewer` logic (already implemented in `App.jsx`). Ensure `setIsLoading(false)` is called in the `finally` block to allow the UI to re-render.

### Book Loading Errors
- **Scenario**: EPUB file is corrupted or too large, causing `epubjs` to fail or timeout.
- **Fix**: Use the structured `errorDetails` logic in `loadBook` to provide specific feedback (e.g., "Libro corrotto", "Timeout caricamento").

### Browser vs Electron Mode
- **Scenario**: Dev mode (`npm run dev`) lacks Electron APIs, causing crashes on file I/O.
- **Fix**: Always use `window.electronAPI?.methodName()`. Gracefully handle `undefined` results (e.g., by disabling saving functionality).

### IPC Communication Failures
- **Scenario**: Handler name mismatch or incorrect arguments.
- **Fix**: Verify `main.cjs` (backend) uses kebab-case strings and `preload.cjs` (bridge) uses camelCase functions. Check the main process logs if a handler isn't responding.

---

## Testing Considerations

When adding tests:
- Use Vitest (Vite-native)
- Test IPC communication by mocking `window.electronAPI`
- Test EPUB rendering with fixture files
- Focus on critical paths: book upload, library management, reader navigation
