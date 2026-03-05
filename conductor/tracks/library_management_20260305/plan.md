# Implementation Plan: Refine Library Management and Collection Persistence

## Phase 1: Schema & IPC Refinement
- [x] Task: Update SQLite schema for advanced collections and tags. [340b20c]
    - [x] Define new table structures in electron/db.cjs.
    - [x] Implement migration scripts for existing data.
- [ ] Task: Enhance IPC handlers for batch operations.
    - [ ] Update electron/main.cjs with new database handlers.
    - [ ] Expose updated API in electron/preload.cjs.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Schema & IPC Refinement' (Protocol in workflow.md)

## Phase 2: Store & Service Layer
- [ ] Task: Write Tests: Library Store updates.
- [ ] Task: Implement: Update useLibraryStore to handle new collection logic.
- [ ] Task: Write Tests: Library Service methods.
- [ ] Task: Implement: Refactor LibraryService.ts for advanced filtering.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Store & Service Layer' (Protocol in workflow.md)

## Phase 3: UI Implementation
- [ ] Task: Write Tests: Collection Management UI.
- [ ] Task: Implement: Update CollectionSidebar and BookCard for new features.
- [ ] Task: Write Tests: Advanced Filtering UI.
- [ ] Task: Implement: Add filter controls to LibraryView.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Implementation' (Protocol in workflow.md)

## Phase 4: Verification
- [ ] Task: Run full suite of E2E tests with Playwright.
- [ ] Task: Perform manual performance profiling for large library loading.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification' (Protocol in workflow.md)