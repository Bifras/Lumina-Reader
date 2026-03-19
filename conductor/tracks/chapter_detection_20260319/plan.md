# Implementation Plan: Fix Chapter Detection and Display

## Phase 1: Robust Chapter Detection Logic
- [ ] Task: Investigate current `epubjs` rendition events (e.g., `relocated`) to see exactly what location data is passed.
- [ ] Task: Update the chapter detection algorithm in `useBookLoader.ts`.
    - [ ] Sub-task: Ensure the logic reliably extracts the `href` or `cfi` from the current location.
    - [ ] Sub-task: Implement a robust matching function that compares the current location against the flattened Table of Contents (`nav.toc`), handling variations in paths (e.g., relative paths, hash fragments).
    - [ ] Sub-task: Test the matching function with various EPUB structures to ensure it consistently finds the correct `label`.
- [ ] Task: Ensure `currentChapter` state is updated accurately and efficiently on every page turn.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Robust Chapter Detection Logic' (Protocol in workflow.md)

## Phase 2: UI Fallback Refinement
- [ ] Task: Update `WindowTitleBar.tsx` to handle `null` or empty `contextLabel` values gracefully.
    - [ ] Sub-task: Remove any generic fallback text (like "Lettura in corso").
    - [ ] Sub-task: Ensure that if no chapter is found, the separator and the chapter label span are completely hidden, leaving only the book title and progress percentage.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Fallback Refinement' (Protocol in workflow.md)

## Phase 3: Testing and Verification
- [ ] Task: Manually test with at least one EPUB containing a well-structured TOC to verify chapter names update correctly.
- [ ] Task: Manually test with an EPUB known to have no TOC or complex internal paths to ensure no errors occur and the UI remains clean (no fallback text).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Testing and Verification' (Protocol in workflow.md)