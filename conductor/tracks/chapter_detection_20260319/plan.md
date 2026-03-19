# Implementation Plan: Fix Chapter Detection and Display

## Phase 1: Robust Chapter Detection Logic
- [x] Task: Investigate current `epubjs` rendition events (e.g., `relocated`) to see exactly what location data is passed. 88e8f4e
- [x] Task: Update the chapter detection algorithm in `useBookLoader.ts`. 88e8f4e
    - [x] Sub-task: Ensure the logic reliably extracts the `href` or `cfi` from the current location. 88e8f4e
    - [x] Sub-task: Implement a robust matching function that compares the current location against the flattened Table of Contents (`nav.toc`), handling variations in paths (e.g., relative paths, hash fragments). 88e8f4e
    - [x] Sub-task: Test the matching function with various EPUB structures to ensure it consistently finds the correct `label`. 88e8f4e
- [x] Task: Ensure `currentChapter` state is updated accurately and efficiently on every page turn. 88e8f4e
- [x] Task: Conductor - User Manual Verification 'Phase 1: Robust Chapter Detection Logic' (Protocol in workflow.md) 88e8f4e

## Phase 2: UI Fallback Refinement
- [x] Task: Update `WindowTitleBar.tsx` to handle `null` or empty `contextLabel` values gracefully. 88e8f4e
    - [x] Sub-task: Remove any generic fallback text (like "Lettura in corso"). 88e8f4e
    - [x] Sub-task: Ensure that if no chapter is found, the separator and the chapter label span are completely hidden, leaving only the book title and progress percentage. 88e8f4e
- [x] Task: Conductor - User Manual Verification 'Phase 2: UI Fallback Refinement' (Protocol in workflow.md) 88e8f4e

## Phase 3: Testing and Verification
- [ ] Task: Manually test with at least one EPUB containing a well-structured TOC to verify chapter names update correctly.
- [ ] Task: Manually test with an EPUB known to have no TOC or complex internal paths to ensure no errors occur and the UI remains clean (no fallback text).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Testing and Verification' (Protocol in workflow.md)