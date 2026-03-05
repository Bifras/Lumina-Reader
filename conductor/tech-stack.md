# Technology Stack: Lumina Reader

## Runtime & Environment
- **Electron**: Main runtime for building the cross-platform desktop application.
- **Node.js**: Underlying execution environment for the main process.

## Build System & Tooling
- **Vite**: Rapid development build tool and module bundler.
- **TypeScript**: Static typing for enhanced developer productivity and code reliability.
- **ESLint**: Linting and code quality enforcement.
- **Vite Plugins**: Support for React and other frontend optimizations.

## Frontend Framework & UI
- **React**: Core library for building the user interface.
- **Framer Motion**: Advanced animation library for smooth UI transitions and interactions.
- **Lucide React**: Comprehensive icon library for UI elements.
- **DnD Kit**: Drag and drop toolkit for library organization features.
- **Zustand**: Lightweight state management for application-wide data.

## Backend & Persistence
- **SQLite (better-sqlite3)**: Primary database for high-performance metadata storage in the main process.
- **localforage**: IndexedDB wrapper for lightweight browser-side persistence and legacy data migration.

## Core Application Engine
- **epubjs**: The core library used to parse and render EPUB eBook content.

## Testing & Quality Assurance
- **Vitest**: Fast unit and component testing runner.
- **Playwright**: Robust End-to-End (E2E) testing framework for cross-browser and app-wide validation.
- **Testing Library**: Utilities for testing UI components from the user's perspective.