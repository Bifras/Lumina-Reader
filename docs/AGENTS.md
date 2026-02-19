# AGENTS.md - Lumina Reader

## Build, Lint, and Test Commands

```bash
# Development
npm run dev              # Vite dev server on localhost:5173
npm run build            # Production build (creates /dist)
npm run lint             # ESLint check

# Unit Tests (Vitest)
npm test                 # Run all tests
npm test -- src/db.test.ts  # Run single test file
npm test -- -t "test name"  # Run single test by name
npm run test:ui          # Run with UI
npm run test:coverage    # Run with coverage

# E2E Tests (Playwright)
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Run with UI
npm run test:e2e:debug   # Debug mode

# Electron
npm run electron:dev     # Vite + Electron
npm run electron:build   # Build Electron app
```

## Code Style Guidelines

### TypeScript
- Use strict TypeScript with explicit types
- Define interfaces for component props and store states
- Use `type` for unions, `interface` for object shapes
- Avoid `any` - use `unknown` with type guards

### Imports Order
```typescript
// 1. React/External libs
import { useState } from 'react'
import { motion } from 'framer-motion'

// 2. Internal modules  
import { useAppStore } from './store'
import { dbService } from './db'

// 3. Types
import type { Book, Bookmark } from './types'

// 4. CSS (last)
import './App.css'
```

### Naming Conventions
- **Components**: PascalCase (`BookCard`, `LibraryView`)
- **Functions/Variables**: camelCase (`loadBook`, `activeBook`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `THEMES`)
- **Types/Interfaces**: PascalCase (`BookCardProps`, `AppStoreState`)
- **Event Handlers**: `handle` prefix (`handleFileUpload`, `handleDeleteBook`)
- **IPC Handlers**: kebab-case in main, camelCase in preload

### Component Pattern
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
- Wrap async operations in try/catch
- Log errors: `console.error("[PREFIX] Message:", error)`
- Use `addToast()` for user-facing messages
- Throw errors in IPC handlers to propagate to renderer

### IPC Communication (Electron)
```typescript
// Always check electronAPI exists (browser dev mode)
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

## Project Architecture

**Electron + React + TypeScript** desktop application for reading EPUB files.

### Tech Stack
- **Frontend**: React 19, Vite, Framer Motion, Zustand
- **Backend**: Electron main process with IPC handlers
- **Data**: IndexedDB (localforage) for metadata, filesystem for EPUB files
- **EPUB Rendering**: epubjs library with custom themes/fonts
- **Testing**: Vitest (unit) + Playwright (E2E)

### File Structure
```
src/
├── App.tsx              # Main React component
├── main.tsx             # React entry point
├── db.ts                # Data access layer
├── components/          # Reusable components
├── views/               # Page-level (LibraryView, ReaderView)
├── hooks/               # Custom hooks
├── store/               # Zustand stores
├── types/               # TypeScript definitions
└── config/              # Configuration files
electron/
├── main.cjs             # Electron main process
└── preload.cjs          # Context bridge
```

## Critical Gotchas

1. **Browser vs Electron Mode**: In `npm run dev`, code runs in browser. Always use `window.electronAPI?.method()` with optional chaining.

2. **File Protocol**: Electron uses `app://` protocol. Use relative paths in Vite config: `base: './'`

3. **CORS**: Local HTTP server for EPUB files must set `Access-Control-Allow-Origin: *`

4. **EPUB Memory**: Always destroy previous book engine before loading new books

5. **Viewer Ref**: Check `viewerRef.current` exists before rendering EPUB

6. **EPUB.js Config**: Use minimal configuration for book.renderTo(). Avoid `snap`, `spread`, `minSpreadWidth` options that cause navigation issues:
   ```typescript
   book.renderTo(viewerRef.current, {
     width: '100%',
     height: '100%',
     flow: 'paginated',
     manager: 'default',
     allowScriptedContent: false
   })
   ```
