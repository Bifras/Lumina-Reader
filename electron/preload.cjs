const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    saveBookFile: (id, arrayBuffer) => {
        // Convert ArrayBuffer to Uint8Array for IPC serialization
        const uint8Array = new Uint8Array(arrayBuffer);
        return ipcRenderer.invoke('save-book', { id, buffer: uint8Array });
    },
    deleteBookFile: (id) => ipcRenderer.invoke('delete-book-file', id),
    getBookServerPort: () => ipcRenderer.invoke('get-book-server-port'),
    // Window Controls
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window'),

    // Database
    db: {
        getAllBooks: () => ipcRenderer.invoke('db:get-all-books'),
        saveBook: (book) => ipcRenderer.invoke('db:save-book', book),
        getBookById: (id) => ipcRenderer.invoke('db:get-book-by-id', id),
        deleteBook: (id) => ipcRenderer.invoke('db:delete-book', id),
        updateBookProgress: (id, cfi, progress) => ipcRenderer.invoke('db:update-book-progress', { id, cfi, progress }),
        batchInsertBooks: (books) => ipcRenderer.invoke('db:batch-insert-books', books),

        getCollections: () => ipcRenderer.invoke('db:get-collections'),
        saveCollection: (collection) => ipcRenderer.invoke('db:save-collection', collection),
        deleteCollection: (id) => ipcRenderer.invoke('db:delete-collection', id),

        getBookCollections: (bookId) => ipcRenderer.invoke('db:get-book-collections', bookId),
        getCollectionBookCount: (collectionId) => ipcRenderer.invoke('db:get-collection-book-count', collectionId),
        addBookToCollection: (bookId, collectionId) => ipcRenderer.invoke('db:add-book-to-collection', { bookId, collectionId }),
        removeBookFromCollection: (bookId, collectionId) => ipcRenderer.invoke('db:remove-book-from-collection', { bookId, collectionId }),

        getAllTags: () => ipcRenderer.invoke('db:get-all-tags'),
        saveTag: (tag) => ipcRenderer.invoke('db:save-tag', tag),
        deleteTag: (id) => ipcRenderer.invoke('db:delete-tag', id),
        addTagToBook: (bookId, tagId) => ipcRenderer.invoke('db:add-tag-to-book', { bookId, tagId }),
        removeTagFromBook: (bookId, tagId) => ipcRenderer.invoke('db:remove-tag-from-book', { bookId, tagId }),
        getBookTags: (bookId) => ipcRenderer.invoke('db:get-book-tags', bookId),

        searchBooks: (filters) => ipcRenderer.invoke('db:search-books', filters),

        getHighlights: (bookId) => ipcRenderer.invoke('db:get-highlights', bookId),
        saveHighlight: (highlight) => ipcRenderer.invoke('db:save-highlight', highlight),
        deleteHighlight: (id) => ipcRenderer.invoke('db:delete-highlight', id),

        getSetting: (key) => ipcRenderer.invoke('db:get-setting', key),
        setSetting: (key, value) => ipcRenderer.invoke('db:set-setting', { key, value }),
    }
});
