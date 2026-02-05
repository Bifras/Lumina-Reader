# Lumina Reader - Agent Development Guide

## Build, Lint, and Test Commands

```bash
# Development (Vite dev server on localhost:5173)
npm run dev

# Build for production (creates /dist folder)
npm run build

# Lint code
npm run lint

# Unit tests (Vitest)
npm test                    # Run all tests
npm test -- src/db.test.ts  # Run single test file
npm run test:ui             # Run with UI
npm run test:coverage       # Run with coverage

# E2E tests (Playwright)
npm run test:e2e            # Run E2E tests
npm run test:e2e:ui         # Run with UI
npm run test:e2e:debug      # Debug mode

# Electron
npm run electron:dev        # Vite + Electron
npm run electron:build      # Build Electron app
```

---

## Project Architecture

**Electron + React + TypeScript** desktop application for reading EPUB files.

### Tech Stack
- **Frontend**: React 19, Vite, Framer Motion, Zustand (with persist middleware)
- **Backend**: Electron main process with IPC handlers
- **Data**: IndexedDB (localforage) for metadata, filesystem for EPUB files
- **EPUB Rendering**: epubjs library with custom themes/fonts
- **Testing**: Vitest (unit) + Playwright (E2E)

### File Structure
```
src/
├── App.tsx              # Main React component
├── main.tsx             # React entry point
├── db.ts                # Data access layer (localforage + IPC)
├── components/          # Reusable components (BookCard, Toast, etc.)
├── views/               # Page-level (LibraryView, ReaderView)
├── hooks/               # Custom hooks (useBookLoader, useHighlights)
├── store/               # Zustand stores (useAppStore, useCollectionStore, etc.)
├── types/               # TypeScript definitions
└── config/fonts.ts      # Font configuration
electron/
├── main.cjs             # Electron main process
└── preload.cjs          # Context bridge for IPC
```

---

## Code Style Guidelines

### TypeScript
- Use strict TypeScript with explicit types for function parameters and returns
- Define interfaces for component props and store states
- Use `type` for unions, `interface` for object shapes
- Avoid `any` - use `unknown` with type guards when necessary

### Imports
```typescript
// Order: External libs → Internal modules → Types → CSS
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from './store'
import type { Book, Bookmark } from './types'
import './App.css'
```

### Naming Conventions
- **Components**: PascalCase (e.g., `BookCard`, `LibraryView`)
- **Functions/Variables**: camelCase (e.g., `loadBook`, `activeBook`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `THEMES`)
- **Types/Interfaces**: PascalCase with descriptive names (e.g., `BookCardProps`, `AppStoreState`)
- **Event Handlers**: `handle` prefix (e.g., `handleFileUpload`, `handleDeleteBook`)
- **IPC Handlers**: kebab-case in main, camelCase in preload (e.g., `delete-book-file` → `deleteBookFile`)

### Component Structure
```typescript
interface BookCardProps {
  book: Book
  onClick: () => void
}

const BookCard = memo(function BookCard({ book, onClick }: BookCardProps) {
  const [coverError, setCoverError] = useState(false)
  
  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }
  
  if (loading) return <Loader />
  
  return (
    <motion.div onClick={onClick}>
      {/* JSX */}
    </motion.div>
  )
})
```

### State Management (Zustand)
```typescript
interface AppStoreState {
  currentTheme: ThemeName
  fontSize: number
}

interface AppStoreActions {
  setTheme: (theme: ThemeName) => void
  increaseFontSize: () => void
}

type AppStore = AppStoreState & AppStoreActions

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentTheme: 'light',
      fontSize: 100,
      setTheme: (theme) => set({ currentTheme: theme }),
      increaseFontSize: () => set((state) => ({
        fontSize: Math.min(state.fontSize + 10, 200)
      })),
    }),
    { name: 'lumina-reader-preferences' }
  )
)
```

### Error Handling
- Always wrap async operations in try/catch
- Log errors with descriptive context: `console.error("[PREFIX] Message:", error)`
- Use `addToast()` for user-facing messages
- In IPC handlers, throw errors to propagate to renderer

### IPC Communication (Electron)
```typescript
// Always check electronAPI exists (graceful in browser dev mode)
if (window.electronAPI?.saveBookFile) {
  await window.electronAPI.saveBookFile(id, buffer)
}

// Available methods:
// - getAppPath(), saveBookFile(id, arrayBuffer), deleteBookFile(id)
// - getBookServerPort(), minimize(), maximize(), close()
```

### Styling
- Use Tailwind-style class names for common patterns
- Prefer inline styles for dynamic values: `style={{ width: '100%' }}`
- Use CSS variables from `:root` in index.css
- No comments in JSX unless explaining complex logic

### Framer Motion
- Use `AnimatePresence` for enter/exit animations
- Use `motion` component: `<motion.div>`, `<motion.button>`
- Spring transitions: `transition={{ type: 'spring', damping: 25, stiffness: 200 }}`

### ESLint Rules
- `@typescript-eslint/no-unused-vars`: Allows uppercase regex pattern for constants
- `@typescript-eslint/no-explicit-any`: 'warn'
- Test files have relaxed rules

---

## Critical Gotchas

1. **Browser vs Electron Mode**: In `npm run dev`, code runs in browser. Always use `window.electronAPI?.method()` with optional chaining.

2. **File Protocol**: Electron uses `app://` protocol. Use relative paths in Vite config: `base: './'`

3. **CORS**: Local HTTP server for EPUB files must set `Access-Control-Allow-Origin: *`

4. **EPUB Memory**: Always destroy previous book engine before loading new books

5. **Viewer Ref**: Check `viewerRef.current` exists before rendering EPUB. May be null during initial render.

6. **Font Loading**: Applied via epub.js themes API + CSS injection with `!important`

---

## Testing

**118 unit tests** configured with Vitest + Playwright E2E.

- Mock `window.electronAPI` for IPC testing
- Mock localforage for IndexedDB testing
- Zustand stores tested with initial states
- E2E tests run against dev server (web mode)
