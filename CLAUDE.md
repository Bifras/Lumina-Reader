# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumina Reader is an Electron + React desktop EPUB reader application. Users can manage a library of EPUB books, read with customizable themes/fonts (including dyslexia-friendly options), track reading progress, and use bookmarks/highlights.

**Stack**: React 19, Electron, Vite, epubjs, Framer Motion, localforage (IndexedDB)

## Commands

```bash
npm run dev              # Vite dev server (localhost:5173, no Electron)
npm run electron:dev     # Full Electron + Vite development
npm run build            # Build React to /dist
npm run electron:build   # Package as Windows .exe
npm run lint             # ESLint
```

No test suite configured. Use Vitest when adding tests.

## Architecture

```
src/
├── App.jsx       # Main component - contains all UI and logic (~1000 LOC)
├── db.js         # Data layer - localforage + Electron IPC helpers
├── main.jsx      # React entry
└── components/   # Toast, etc.

electron/
├── main.cjs      # Main process - IPC handlers, HTTP server for EPUBs
└── preload.cjs   # Context bridge (window.electronAPI)
```

### Data Flow
- Book metadata stored in IndexedDB via localforage
- EPUB files stored in filesystem at `userData/books/`
- Local HTTP server (127.0.0.1:randomPort) serves EPUBs to renderer
- IPC communication via `window.electronAPI` methods

### Key Patterns

**IPC Communication**:
```javascript
// Always check electronAPI exists (fails gracefully in browser dev mode)
if (window.electronAPI?.saveBookFile) {
  await window.electronAPI.saveBookFile(id, buffer)
}
```

**EPUB Loading** - Critical memory management:
```javascript
// Always destroy previous book before loading new one
if (bookEngine) {
  rendition.off('relocated', relocatedHandlerRef.current)
  bookEngine.destroy()
}
```

**Error Handling**:
```javascript
try {
  await operation()
  addToast("Success", "success")
} catch (error) {
  console.error("[ERROR] Context:", error)
  addToast("User message", "error", "Title")
}
```

## Code Style

- **Imports**: External libs → Internal modules → CSS
- **Components**: Functional with hooks, early returns for conditionals
- **Naming**: PascalCase components, camelCase functions, `handle` prefix for event handlers
- **State**: useState for local state, useRef for DOM/persistent values, useEffect with dependency arrays
- **Styling**: CSS variables from `:root`, inline styles for dynamic values

## Critical Gotchas

1. **Viewer Ref Null**: Check `viewerRef.current` exists before rendering EPUB - may be null during initial render
2. **CORS**: Book server must set `Access-Control-Allow-Origin: *` for app:// to fetch from http://127.0.0.1
3. **Browser Dev Mode**: `npm run dev` runs without Electron - `window.electronAPI` will be undefined
4. **Book Server Port**: Dynamic port - always call `getBookServerPort()` IPC, never hardcode
5. **CFI Strings**: Save but don't modify - used for exact resume position in EPUBs
