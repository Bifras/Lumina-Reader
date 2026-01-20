const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    saveBookFile: (id, buffer) => ipcRenderer.invoke('save-book', { id, buffer }),
    deleteBookFile: (id) => ipcRenderer.invoke('delete-book-file', id),
    getBookServerPort: () => ipcRenderer.invoke('get-book-server-port'),
    // Window Controls
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window'),
});
