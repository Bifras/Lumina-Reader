# Specification: Fix Chapter Detection and Display

## Overview
This track addresses an issue in the Reader View where the current chapter name is not being correctly identified and displayed in the Window Title Bar. The goal is to implement robust logic to accurately extract the current chapter from the EPUB's Table of Contents (TOC) based on the user's current reading position, and to refine the UI to elegantly handle cases where chapter information is unavailable.

## Functional Requirements
1.  **Robust Chapter Detection:** Improve the logic within `useBookLoader` (or related context) to accurately determine the current chapter name. This involves mapping the current reading location (e.g., CFI or href provided by `epub.js`) to the correct entry in the EPUB's TOC.
2.  **Accurate Matching:** The logic must account for discrepancies between EPUB internal paths and TOC hrefs (e.g., resolving paths, ignoring hash fragments if necessary).
3.  **UI Integration:** The detected chapter name must be passed to and correctly displayed in the `WindowTitleBar` component.
4.  **Fallback Behavior:** If a chapter name cannot be determined (e.g., the EPUB lacks a TOC, or the user is on a preliminary page like a cover), the chapter label area in the title bar must remain completely empty (no generic fallback text like "Lettura in corso").

## Non-Functional Requirements
-   **Performance:** Chapter detection must happen synchronously with page turns or location updates without causing noticeable lag in the UI.
-   **Maintainability:** The parsing logic should be cleanly separated and easy to understand.

## Acceptance Criteria
-   When reading an EPUB with a valid TOC, the correct chapter name appears next to the book title in the title bar as pages are turned.
-   When transitioning between chapters, the displayed chapter name updates correctly.
-   If the current location does not map to a chapter (or the EPUB has no TOC), no chapter name or fallback text is displayed.
-   No console errors related to chapter detection occur during normal reading.

## Out of Scope
-   Major UI redesigns of the `WindowTitleBar` beyond displaying the chapter.
-   Modifications to how the EPUB is rendered or parsed beyond extracting TOC information.