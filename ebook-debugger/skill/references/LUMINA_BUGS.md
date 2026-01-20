# Lumina Reader - Documented Bugs

This document lists all discovered bugs in Lumina Reader, their root causes, and verified fixes.

## Bug #1: Reset Button Destroys Database

### Severity: Critical
### Status: ✅ Fixed

### Symptoms
- Clicking "Reset" button clears library
- App becomes completely unresponsive
- Cannot add new books after reset
- Cannot read any books
- IndexedDB appears corrupted

### Root Cause
In `src/db.js:9`, the `clearLibrary()` function used:
```javascript
await localforage.clear()
```

This destroys the **entire** IndexedDB database, not just the books array. This corrupts the localforage instance and prevents any future operations.

### Fix Applied
Changed to remove only the 'books' key:
```javascript
export const clearLibrary = async () => {
    await localforage.removeItem('books');
    return [];
};
```

Also fixed in `src/App.jsx:338` (manual reset path):
```javascript
// Old (broken):
localforage.clear().then(() => { ... })

// New (fixed):
localforage.removeItem('books').then(() => { ... })
```

### Files Modified
- `src/db.js:9`
- `src/App.jsx:338`

### Testing
1. Add test book to library
2. Click "Reset" button
3. Verify library is cleared
4. Add new book - should work
5. Read new book - should work

---

## Bug #2: activeBook Undefined When Loading from Library

### Severity: High
### Status: ✅ Fixed

### Symptoms
- Loading a book from library shows errors
- UI doesn't update correctly
- Book metadata missing from state

### Root Cause
In `src/App.jsx:236`, the code used ternary operator that could return undefined:
```javascript
setActiveBook(bookId ? library.find(b => b.id === bookId) : { id: 'temp', title: meta.title })
```

If `library.find()` doesn't find the book (race condition), it returns `undefined`, which is set as activeBook.

### Fix Applied
Added explicit null check with fallback:
```javascript
if (bookId) {
  const libraryBook = library.find(b => b.id === bookId)
  setActiveBook(libraryBook || { id: 'temp', title: meta.title })
} else {
  setActiveBook({ id: 'temp', title: meta.title })
}
```

### Files Modified
- `src/App.jsx:236-240`

---

## Bug #3: Memory Leaks - Event Listeners Not Cleaned Up

### Severity: Medium
### Status: ✅ Fixed

### Symptoms
- App becomes slower over time
- Multiple event handlers firing for same event
- Progress tracking works multiple times

### Root Cause
Event listeners attached to epubjs rendition were not being removed when:
- Loading a new book
- Closing the reader
- Component unmounts

Example in `src/App.jsx:226`:
```javascript
// Old code - listener never removed
rendition.on("relocated", (location) => {
  // Progress tracking code
})
```

### Fix Applied
1. Added ref to track handler: `relocatedHandlerRef`
2. Remove listener when destroying book engine
3. Use fresh content references in cleanup

```javascript
// New code - handler tracked and cleaned up
relocatedHandlerRef.current = (location) => {
  // Progress tracking code
}
rendition.on("relocated", relocatedHandlerRef.current)

// Cleanup when destroying book
if (rendition && relocatedHandlerRef.current) {
  rendition.off('relocated', relocatedHandlerRef.current)
  relocatedHandlerRef.current = null
}
```

### Files Modified
- `src/App.jsx:70` (added ref)
- `src/App.jsx:132-141` (cleanup in loadBook)
- `src/App.jsx:226-232` (ref-based handler)

---

## Bug #4: searchQuery Undefined Error

### Severity: Medium
### Status: ✅ Fixed

### Symptoms
- TypeError when searching in book
- "Cannot read properties of undefined (reading 'trim')"

### Root Cause
In `src/App.jsx:479`, the code called `.trim()` without checking if `searchQuery` exists:
```javascript
if (!bookEngine || !searchQuery.trim()) return
```

If `searchQuery` is `undefined` or `null`, calling `.trim()` throws TypeError.

### Fix Applied
Added null/undefined check before calling `.trim()`:
```javascript
if (!bookEngine || !searchQuery || !searchQuery.trim()) return
```

### Files Modified
- `src/App.jsx:479`

---

## Bug #5: Stale Event Listener References

### Severity: Medium
### Status: ✅ Fixed

### Symptoms
- Event listeners not removed on cleanup
- Memory leaks from multiple event listeners
- Selection handler errors

### Root Cause
In `src/App.jsx:552-556`, the cleanup closure captured stale `contents` variable:
```javascript
// Old code - uses stale reference
const contents = rendition.getContents()
contents.forEach(content => {
  content.document.addEventListener('mouseup', handleSelection)
})

return () => {
  contents.forEach(content => {
    content.document.removeEventListener('mouseup', handleSelection) // contents is stale!
  })
}
```

### Fix Applied
Get fresh contents in cleanup function:
```javascript
// New code - fresh reference
return () => {
  const currentContents = rendition.getContents() // Fresh reference
  currentContents.forEach(content => {
    content.document.removeEventListener('mouseup', handleSelection)
  })
}
```

### Files Modified
- `src/App.jsx:560-566`

---

## Bug #6: Missing Input Validation in Database Functions

### Severity: Low
### Status: ✅ Fixed

### Symptoms
- Hard-to-debug errors when data is malformed
- No helpful error messages for invalid inputs
- Database operations can fail silently

### Root Cause
Database functions in `src/db.js` didn't validate input parameters.

### Fix Applied
Added input validation to all database functions:
```javascript
// saveBookMetadata
if (!bookData || !bookData.id || !bookData.title) {
  throw new Error('Invalid book data: missing required fields')
}

// updateProgress, removeBook, deleteBookFile
if (!id) {
  throw new Error('Invalid book id')
}

// saveBookFile
if (!id || !arrayBuffer) {
  throw new Error('Invalid parameters: missing id or arrayBuffer')
}
```

### Files Modified
- `src/db.js:13-15, 41, 51, 58, 66`

---

## Summary

**Total bugs fixed:** 6
- 2 Critical/High severity
- 4 Medium severity

**Build status:** ✅ Production build completed (Lumina Reader 1.0.9.exe)

**All fixes verified and tested.**
