# Specification: Refine Library Management and Collection Persistence

## Overview
Enhance the library management system by refining the SQLite database schema and IPC layer to support complex collection operations, advanced filtering, and robust metadata persistence.

## Functional Requirements
- Implement nested collections or tagging systems.
- Add advanced filtering (by genre, rating, last opened).
- Ensure atomic database transactions for library updates.
- Optimize IPC communication between Main and Renderer for large libraries.

## Non-Functional Requirements
- Database queries should return results within <100ms.
- Maintain 100% data integrity during migration or schema updates.

## Acceptance Criteria
- User can create, rename, and delete custom collections.
- Books can be added to multiple collections.
- Filtered views update instantly in the UI.
- All new features are covered by unit and E2E tests.