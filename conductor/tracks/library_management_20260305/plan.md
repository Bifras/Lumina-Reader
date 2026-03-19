# Implementation Plan: Refine Library Management and Collection Persistence

## Phase 1: Schema & IPC Refinement [checkpoint: dddce02]
- [x] Task: Update SQLite schema for advanced collections and tags. [340b20c]
    - [x] Define new table structures in electron/db.cjs.
    - [x] Implement migration scripts for existing data.
- [x] Task: Enhance IPC handlers for batch operations. [d8bfebe]
    - [x] Update electron/main.cjs with new database handlers.
    - [x] Expose updated API in electron/preload.cjs.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Schema & IPC Refinement' (Protocol in workflow.md)

## Phase 2: Store & Service Layer
- [x] Task: Write Tests: Library Store updates. [9ae3909]
- [x] Task: Implement: Update useLibraryStore to handle new collection logic. [9ae3909]
- [x] Task: Write Tests: Library Service methods. [1615fec]
- [x] Task: Implement: Refactor LibraryService.ts for advanced filtering. [1615fec]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Store & Service Layer' (Protocol in workflow.md)

## Phase 3: UI Implementation
- [x] Task: Write Tests: Collection Management UI. [dc27b98]
- [x] Task: Implement: Update CollectionSidebar and BookCard for new features. [dc27b98]
- [x] Task: Write Tests: Advanced Filtering UI. [43639a6]
- [x] Task: Implement: Add filter controls to LibraryView. [43639a6]
- [x] Task: Conductor - User Manual Verification 'Phase 3: UI Implementation' (Protocol in workflow.md)

## Phase 4: Verification
- [~] Task: Run full suite of E2E tests with Playwright.
- [ ] Task: Perform manual performance profiling for large library loading.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification' (Protocol in workflow.md)