# TODO: SQLite Database Implementation

- [x] **Phase 1: Dependencies & Initialization**
    - [x] Install `better-sqlite3` and its types.
    - [x] Create `electron/db.cjs` for database management.
- [x] **Phase 2: Main Process Integration**
    - [x] Integrate `db.cjs` in `electron/main.cjs`.
    - [x] Setup IPC handlers for database CRUD operations.
    - [x] Update `electron/preload.cjs` to expose the database API.
- [x] **Phase 3: Migration Layer**
    - [x] Implement migration logic in `src/db.ts` to move data from `localforage` to SQLite.
- [x] **Phase 4: DatabaseService Refactor**
    - [x] Refactor `src/db.ts` to use `window.electronAPI.db`.
- [x] **Phase 5: Testing & Validation**
    - [x] Update unit tests in `src/db.test.js`.
    - [x] Verify functionality with manual/E2E tests.
