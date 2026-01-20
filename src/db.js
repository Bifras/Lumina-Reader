import localforage from 'localforage';

localforage.config({
    name: 'LuminaReader',
    storeName: 'library'
});

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
 * Salva il file EPUB sul disco tramite Electron IPC
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
    // Modalità browser: salvataggio su disco non disponibile
    return null;
};

/**
 * Elimina il file EPUB dal disco tramite Electron IPC
 * @param {string} id ID del libro
 */
export const deleteBookFile = async (id) => {
    if (!id) {
        throw new Error('ID libro non valido');
    }
    if (window.electronAPI?.deleteBookFile) {
        return await window.electronAPI.deleteBookFile(id);
    }
    // Modalità browser: eliminazione da disco non disponibile
    return false;
};
