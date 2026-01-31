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
});
