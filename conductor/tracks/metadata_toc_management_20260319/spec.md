# Specification: Advanced Metadata & TOC Management

## Overview
This track introduces a comprehensive metadata management system for the Lumina Reader. It empowers users to manually edit book details, automatically fetch high-quality metadata from the web (Google Books and Open Library APIs), and, crucially, generate or fix the Table of Contents (TOC) to ensure perfect chapter tracking during reading.

## Functional Requirements
1.  **Metadata Editing Interface:**
    -   Implement a "Modal Dialog" accessible from the `BookCard` context menu or Library view.
    -   Allow manual editing of: Title, Author, Cover Image (upload or URL), and Tags/Genre.
2.  **Web Metadata Acquisition:**
    -   Integrate both **Google Books API** and **Open Library API**.
    -   Provide an "Auto-Fill" button in the edit modal that searches these APIs using the current title/author.
    -   Allow users to preview and select the best match from the combined API results to overwrite the local metadata (including high-quality covers).
3.  **Advanced TOC Management:**
    -   **Auto-Generation:** Provide a tool that analyzes the EPUB's internal HTML structure (looking for headers like `<h1>`, `<h2>`) to automatically build a valid TOC if one is missing or broken.
    -   **Manual Editing:** Allow users to manually add, remove, or rename TOC entries and link them to specific sections within the EPUB.
    -   **Persistence:** The generated/edited TOC and metadata must be saved. Changes to the core EPUB file (like modifying the internal `toc.ncx` or `nav.xhtml`) should be handled carefully via the Main process, or the overridden TOC should be stored in the local SQLite database and injected at runtime by `epubjs`.

## Non-Functional Requirements
-   **Performance:** API calls must be asynchronous and provide clear loading states (spinners) so the UI doesn't freeze.
-   **Safety:** Modifying the original EPUB file must be done non-destructively or with clear user consent, perhaps creating a backup first, or relying solely on the SQLite database for overrides.

## Acceptance Criteria
-   A user can open the edit modal for any book and manually change its title, author, and cover.
-   Clicking "Auto-Fill" successfully fetches data from external APIs and updates the input fields.
-   A user can trigger TOC auto-generation for a book that previously showed no chapters during reading.
-   After TOC generation/editing, opening the book correctly displays the new chapter names in the top title bar as the user turns pages.
-   All edited metadata persists across application restarts.

## Out of Scope
-   Mass/bulk metadata editing for multiple books at once.
-   Full EPUB authoring/editing beyond the TOC and standard metadata.