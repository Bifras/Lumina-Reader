# Plan: SQLite Database Implementation

This plan outlines the migration of metadata storage from IndexedDB (`localforage`) to a robust SQLite database handled in the Electron Main process.

## 🎯 Goals
- Improve performance and reliability of data management.
- Enable complex queries (e.g., advanced filtering, search).
- Centralize metadata storage in the Main process.
- Provide a smooth migration for existing users.

## 🏗️ Architecture
- **Database Engine**: `better-sqlite3` (running in Electron Main process).
- **Communication**: IPC (Inter-Process Communication) bridge between Renderer and Main.
- **Service Layer**: Update `DatabaseService` in `src/db.ts` to act as a proxy for the Main process database API.

## 📊 Database Schema

### Table: `books`
- `id` (TEXT, PRIMARY KEY)
- `title` (TEXT, NOT NULL)
- `author` (TEXT)
- `cover` (TEXT) - Data URL or path
- `cfi` (TEXT) - Last reading position
- `progress` (REAL) - 0.0 to 100.0
- `addedAt` (INTEGER) - Timestamp
- `lastOpened` (INTEGER) - Timestamp
- `isFavorite` (INTEGER) - 0 or 1
- `genre` (TEXT)
- `rating` (INTEGER) - 0 to 5

### Table: `collections`
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `type` (TEXT) - 'custom'
- `icon` (TEXT)
- `color` (TEXT)
- `createdAt` (INTEGER)
- `orderIndex` (INTEGER)

### Table: `book_collections` (Many-to-Many)
- `bookId` (TEXT, FOREIGN KEY)
- `collectionId` (TEXT, FOREIGN KEY)
- PRIMARY KEY (`bookId`, `collectionId`)

### Table: `highlights`
- `id` (TEXT, PRIMARY KEY)
- `bookId` (TEXT, FOREIGN KEY)
- `cfi` (TEXT, NOT NULL)
- `text` (TEXT)
- `color` (TEXT)
- `note` (TEXT)
- `createdAt` (INTEGER)

### Table: `settings`
- `key` (TEXT, PRIMARY KEY)
- `value` (TEXT) - JSON stringified

---

## 🗓️ Step-by-Step Execution

### Phase 1: Dependencies & Initialization
1.  **Install dependencies**:
    ```bash
    npm install better-sqlite3
    npm install --save-dev @types/better-sqlite3
    ```
2.  **Create Database Manager**: Create `electron/db.cjs` to handle:
    - Database file initialization (in `app.getPath('userData')`).
    - Schema creation and migrations (using a simple migration system).
    - Prepared statements for performance.

### Phase 2: Main Process Integration
1.  **Integrate in `main.cjs`**:
    - Import the database manager.
    - Setup IPC handlers (`ipcMain.handle`) for all database operations (CRUD).
2.  **Update `preload.cjs`**:
    - Expose the new database API to the Renderer process via `contextBridge`.

### Phase 3: Migration Layer (Critical)
1.  **Implement Migration Logic**: In `src/db.ts`, create a check that runs on startup:
    - If a special flag `sqlite_migrated` is not set in `localStorage`.
    - Read all data from `localforage`.
    - Batch insert into the new SQLite database via IPC.
    - Set the `sqlite_migrated` flag.

### Phase 4: DatabaseService Refactor
1.  **Refactor `src/db.ts`**:
    - Replace `localforage` calls with calls to `window.electronAPI.db`.
    - Maintain existing method signatures to minimize impact on the rest of the app.
    - Implement specialized methods for complex queries if needed.

### Phase 5: Testing & Validation
1.  **Unit Tests**: Update `src/db.test.js` to mock the Electron IPC and verify logic.
2.  **E2E Tests**: Run Playwright tests to ensure book import and collection management still work.
3.  **Manual Verification**: Confirm data persistence and migration success.

---

## ❓ Clarifying Questions for the User
1. Do you have any preference for the SQLite library? I recommended `better-sqlite3` for performance.
2. Should we keep the IndexedDB as a fallback, or can we completely remove `localforage` after successful migration?
3. Are there any "other" data types besides books, collections, and highlights that you want to include in the database? (e.g., Reading Statistics, Tags).
