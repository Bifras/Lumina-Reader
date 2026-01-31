import localforage from 'localforage';

// Generate UUID with fallback for non-secure contexts
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

localforage.config({
    name: 'LuminaReader',
    storeName: 'library'
});

// --- Collections Functions ---

/**
 * Recupera tutte le collezioni
 * @returns {Promise<Array>} Lista delle collezioni
 */
export const getCollections = async () => {
    const collections = await localforage.getItem('collections');
    if (!collections) {
        // Initialize with default collections
        const defaultCollections = [
            { id: 'all', name: 'Tutti i Libri', type: 'smart', icon: 'Library', isDefault: true },
            { id: 'reading', name: 'In Lettura', type: 'smart', icon: 'BookOpen', isDefault: true },
            { id: 'finished', name: 'Completati', type: 'smart', icon: 'CheckCircle', isDefault: true },
            { id: 'unread', name: 'Da Leggere', type: 'smart', icon: 'Bookmark', isDefault: true },
            { id: 'favorites', name: 'Preferiti', type: 'custom', icon: 'Heart', isDefault: true }
        ];
        await localforage.setItem('collections', defaultCollections);
        return defaultCollections;
    }
    return collections;
};

/**
 * Crea una nuova collezione
 * @param {Object} collectionData Dati della collezione
 * @returns {Promise<Object>} La collezione creata
 */
export const createCollection = async (collectionData) => {
    const collections = await getCollections();
    const newCollection = {
        id: generateId(),
        name: collectionData.name,
        type: 'custom',
        icon: collectionData.icon || 'Folder',
        color: collectionData.color || '#c05d4e',
        createdAt: Date.now(),
        isDefault: false
    };
    collections.push(newCollection);
    await localforage.setItem('collections', collections);
    return newCollection;
};

/**
 * Aggiorna una collezione
 * @param {string} id ID della collezione
 * @param {Object} updates Campi da aggiornare
 * @returns {Promise<Array>} Lista collezioni aggiornata
 */
export const updateCollection = async (id, updates) => {
    const collections = await getCollections();
    const index = collections.findIndex(c => c.id === id);
    if (index !== -1 && !collections[index].isDefault) {
        collections[index] = { ...collections[index], ...updates };
        await localforage.setItem('collections', collections);
    }
    return collections;
};

/**
 * Elimina una collezione
 * @param {string} id ID della collezione
 * @returns {Promise<Array>} Lista collezioni aggiornata
 */
export const deleteCollection = async (id) => {
    const collections = await getCollections();
    const filtered = collections.filter(c => c.id !== id || c.isDefault);
    await localforage.setItem('collections', filtered);
    
    // Also remove all book associations with this collection
    const bookCollections = await localforage.getItem('bookCollections') || {};
    for (const bookId in bookCollections) {
        bookCollections[bookId] = bookCollections[bookId].filter(cid => cid !== id);
    }
    await localforage.setItem('bookCollections', bookCollections);
    
    return filtered;
};

/**
 * Aggiunge un libro a una collezione
 * @param {string} bookId ID del libro
 * @param {string} collectionId ID della collezione
 */
export const addBookToCollection = async (bookId, collectionId) => {
    const bookCollections = await localforage.getItem('bookCollections') || {};
    if (!bookCollections[bookId]) {
        bookCollections[bookId] = [];
    }
    if (!bookCollections[bookId].includes(collectionId)) {
        bookCollections[bookId].push(collectionId);
        await localforage.setItem('bookCollections', bookCollections);
    }
};

/**
 * Rimuove un libro da una collezione
 * @param {string} bookId ID del libro
 * @param {string} collectionId ID della collezione
 */
export const removeBookFromCollection = async (bookId, collectionId) => {
    const bookCollections = await localforage.getItem('bookCollections') || {};
    if (bookCollections[bookId]) {
        bookCollections[bookId] = bookCollections[bookId].filter(cid => cid !== collectionId);
        await localforage.setItem('bookCollections', bookCollections);
    }
};

/**
 * Recupera le collezioni di un libro
 * @param {string} bookId ID del libro
 * @returns {Promise<Array>} Lista ID collezioni
 */
export const getBookCollections = async (bookId) => {
    const bookCollections = await localforage.getItem('bookCollections') || {};
    return bookCollections[bookId] || [];
};

/**
 * Recupera tutti i libri di una collezione
 * @param {string} collectionId ID della collezione
 * @param {Array} library Lista completa dei libri
 * @returns {Array} Libri filtrati per collezione
 */
export const getBooksInCollection = (collectionId, library) => {
    switch (collectionId) {
        case 'all':
            return library;
        case 'reading':
            return library.filter(b => b.progress > 0 && b.progress < 100);
        case 'finished':
            return library.filter(b => b.progress === 100);
        case 'unread':
            return library.filter(b => !b.progress || b.progress === 0);
        default:
            // For custom collections, we'd need to check bookCollections
            // This is handled asynchronously in the component
            return library;
    }
};

/**
 * Cancella l'intera libreria (metadata)
 * @returns {Promise<Array>} Una lista vuota
 */
export const clearLibrary = async () => {
    await localforage.removeItem('books');
    return [];
};

/**
 * Salva i metadati di un libro nella libreria
 * @param {Object} bookData I metadati del libro
 * @returns {Promise<Array>} La libreria aggiornata
 */
export const saveBookMetadata = async (bookData) => {
    if (!bookData || !bookData.id || !bookData.title) {
        throw new Error('Dati libro non validi: campi obbligatori mancanti (id, titolo)');
    }
    const library = (await localforage.getItem('books')) || [];
    const index = library.findIndex(b => b.id === bookData.id);

    const metadata = {
        id: bookData.id,
        title: bookData.title,
        author: bookData.author,
        cover: bookData.cover,
        cfi: bookData.cfi,
        progress: bookData.progress,
        addedAt: bookData.addedAt
    };

    if (index !== -1) {
        library[index] = { ...library[index], ...metadata };
    } else {
        library.push(metadata);
    }

    await localforage.setItem('books', library);
    return library;
};

/**
 * Recupera la lista dei libri (metadati)
 * @returns {Promise<Array>} La lista dei libri
 */
export const getLibrary = async () => {
    return (await localforage.getItem('books')) || [];
};

/**
 * Aggiorna il progresso di lettura e l'ultima posizione (CFI)
 * @param {string} id ID del libro
 * @param {string} cfi Posizione EPUB (CFI)
 * @param {number} progress Percentuale di progresso (0-100)
 */
export const updateProgress = async (id, cfi, progress) => {
    if (!id) {
        throw new Error('ID libro non valido');
    }
    const library = await getLibrary();
    const index = library.findIndex(b => b.id === id);
    if (index !== -1) {
        library[index].cfi = cfi;
        library[index].progress = progress;
        await localforage.setItem('books', library);
    }
};

/**
 * Rimuove un libro dalla libreria (metadati)
 * @param {string} id ID del libro
 * @returns {Promise<Array>} La libreria aggiornata
 */
export const removeBook = async (id) => {
    if (!id) {
        throw new Error('ID libro non valido');
    }
    const library = await getLibrary();
    const filtered = library.filter(b => b.id !== id);
    await localforage.setItem('books', filtered);
    return filtered;
};

/**
 * Salva il file EPUB sul disco tramite Electron IPC (o IndexedDB in modalità browser)
 * @param {string} id ID del libro
 * @param {ArrayBuffer} arrayBuffer Contenuto del file
 */
export const saveBookFile = async (id, arrayBuffer) => {
    if (!id || !arrayBuffer) {
        throw new Error('Parametri mancanti: id o arrayBuffer');
    }
    if (window.electronAPI?.saveBookFile) {
        return await window.electronAPI.saveBookFile(id, arrayBuffer);
    }
    // Modalità browser: salva in IndexedDB
    try {
        await localforage.setItem(`book_file_${id}`, arrayBuffer);
        console.log('[DB] Book file saved to IndexedDB:', id);
        return { success: true, source: 'indexeddb' };
    } catch (error) {
        console.error('[DB] Failed to save book file to IndexedDB:', error);
        throw error;
    }
};

/**
 * Elimina il file EPUB dal disco tramite Electron IPC (o IndexedDB in modalità browser)
 * @param {string} id ID del libro
 */
export const deleteBookFile = async (id) => {
    if (!id) {
        throw new Error('ID libro non valido');
    }
    if (window.electronAPI?.deleteBookFile) {
        return await window.electronAPI.deleteBookFile(id);
    }
    // Modalità browser: elimina da IndexedDB
    try {
        await localforage.removeItem(`book_file_${id}`);
        console.log('[DB] Book file deleted from IndexedDB:', id);
        return true;
    } catch (error) {
        console.error('[DB] Failed to delete book file from IndexedDB:', error);
        return false;
    }
};

/**
 * Recupera il file EPUB (da Electron IPC o IndexedDB in modalità browser)
 * @param {string} id ID del libro
 * @returns {Promise<ArrayBuffer|null>} Il contenuto del file
 */
export const getBookFile = async (id) => {
    if (!id) {
        throw new Error('ID libro non valido');
    }
    
    // Modalità Electron: usa il server HTTP
    if (window.electronAPI?.getBookServerPort) {
        try {
            const port = await window.electronAPI.getBookServerPort();
            const response = await fetch(`http://127.0.0.1:${port}/${id}.epub`);
            if (response.ok) {
                return await response.arrayBuffer();
            }
        } catch (error) {
            console.warn('[DB] Failed to fetch from Electron server:', error);
        }
    }
    
    // Modalità browser: recupera da IndexedDB
    try {
        const data = await localforage.getItem(`book_file_${id}`);
        if (data) {
            console.log('[DB] Book file retrieved from IndexedDB:', id);
            return data;
        }
    } catch (error) {
        console.error('[DB] Failed to get book file from IndexedDB:', error);
    }
    
    return null;
};
