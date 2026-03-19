# Implementation Plan: Advanced Metadata & TOC Management

## Phase 1: Metadata Editing UI (Modal)
- [x] Task: Create a new `EditMetadataModal.tsx` component. fabdf12
    - [x] Sub-task: Design the form with fields for Title, Author, Tags/Genre. fabdf12
    - [x] Sub-task: Add a section for Cover Image (preview, URL input, file upload button). fabdf12
    - [x] Sub-task: Integrate the modal into the existing `LibraryView` or `BookCard` context menu. fabdf12
- [x] Task: Connect the modal to the `LibraryService` to save manual edits to the local database. fabdf12
- [x] Task: Conductor - User Manual Verification 'Phase 1: Metadata Editing UI' (Protocol in workflow.md) de51636

## Phase 2: Web Metadata Acquisition (API Integration)
- [x] Task: Implement API fetching logic in `LibraryService` or a new dedicated service. 31d7910
    - [x] Sub-task: Integrate Google Books API (search by title/author). 31d7910
    - [x] Sub-task: Integrate Open Library API as a secondary/fallback source. 31d7910
- [x] Task: Update the `EditMetadataModal` to include an "Auto-Fill" button. 31d7910
    - [x] Sub-task: Implement loading states and error handling for API calls. 31d7910
    - [x] Sub-task: Create a preview mechanism to let the user select from multiple API results before applying. 31d7910
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Web Metadata Acquisition' (Protocol in workflow.md)

## Phase 3: Advanced TOC Management
- [ ] Task: Implement TOC auto-generation logic.
    - [ ] Sub-task: Create a function to parse EPUB HTML files and extract `<h1>`, `<h2>`, etc.
    - [ ] Sub-task: Build a new TOC structure based on the extracted headers and their CFI/href locations.
- [ ] Task: Create a "TOC Editor" section within or alongside the `EditMetadataModal`.
    - [ ] Sub-task: Add a button to trigger the auto-generation.
    - [ ] Sub-task: Provide a basic UI to view the current/generated TOC structure.
- [ ] Task: Implement the persistence mechanism for the overridden TOC.
    - [ ] Sub-task: Save the new TOC structure to the local SQLite database.
    - [ ] Sub-task: Update `useBookLoader` to check for and inject the local DB TOC override when rendering the EPUB.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Advanced TOC Management' (Protocol in workflow.md)