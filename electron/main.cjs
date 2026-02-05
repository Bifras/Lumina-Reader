const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const http = require('http');
const handler = require('serve-handler');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let bookServer;
let bookServerPort = 0;

// Path for storing books
let booksDir;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#faf9f6',
            symbolColor: '#1a1a1a',
            height: 38
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false,
            allowRunningInsecureContent: true
        }
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        console.log('[Main] Loading index.html from:', indexPath);
        mainWindow.loadFile(indexPath);
        
        // Open DevTools to see errors
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create books directory
function setupBooksDirectory() {
    const userDataPath = app.getPath('userData');
    booksDir = path.join(userDataPath, 'books');
    
    if (!fs.existsSync(booksDir)) {
        fs.mkdirSync(booksDir, { recursive: true });
        console.log('[Main] Created books directory:', booksDir);
    } else {
        console.log('[Main] Books directory exists:', booksDir);
    }
}

// Start local HTTP server for serving EPUB files
async function startBookServer() {
    return new Promise((resolve, reject) => {
        bookServer = http.createServer((request, response) => {
            // Set CORS headers to allow app:// protocol
            response.setHeader('Access-Control-Allow-Origin', '*');
            response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            
            // Handle preflight requests
            if (request.method === 'OPTIONS') {
                response.writeHead(200);
                response.end();
                return;
            }
            
            return handler(request, response, {
                public: booksDir,
                headers: [
                    {
                        source: '**/*.epub',
                        headers: [
                            {
                                key: 'Content-Type',
                                value: 'application/epub+zip'
                            }
                        ]
                    }
                ]
            });
        });

        // Find an available port
        bookServer.listen(0, '127.0.0.1', () => {
            bookServerPort = bookServer.address().port;
            console.log('[Main] Book server started on port:', bookServerPort);
            resolve(bookServerPort);
        });

        bookServer.on('error', (err) => {
            console.error('[Main] Book server error:', err);
            reject(err);
        });
    });
}

// IPC Handlers
function setupIPCHandlers() {
    // Get app path
    ipcMain.handle('get-app-path', () => {
        return app.getPath('userData');
    });

    // Save book file
    ipcMain.handle('save-book', async (event, { id, buffer }) => {
        try {
            const filePath = path.join(booksDir, `${id}.epub`);
            // Buffer receives serialized Uint8Array as an object with numeric keys
            // Convert it back to a proper Buffer
            const values = Object.values(buffer);
            const bufferData = Buffer.from(values);
            await fs.promises.writeFile(filePath, bufferData);
            console.log('[Main] Saved book file:', filePath, 'Size:', bufferData.length, 'bytes');
            return { success: true, path: filePath, size: bufferData.length };
        } catch (error) {
            console.error('[Main] Error saving book:', error);
            throw error;
        }
    });

    // Delete book file
    ipcMain.handle('delete-book-file', async (event, id) => {
        try {
            const filePath = path.join(booksDir, `${id}.epub`);
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                console.log('[Main] Deleted book file:', filePath);
            }
            return { success: true };
        } catch (error) {
            console.error('[Main] Error deleting book:', error);
            throw error;
        }
    });

    // Get book server port
    ipcMain.handle('get-book-server-port', () => {
        return bookServerPort;
    });

    // Window controls
    ipcMain.handle('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    ipcMain.handle('maximize-window', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.handle('close-window', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });
}

// App event handlers
app.whenReady().then(async () => {
    console.log('[Main] App is ready');
    
    setupBooksDirectory();
    await startBookServer();
    setupIPCHandlers();
    createWindow();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Stop the book server
    if (bookServer) {
        bookServer.close(() => {
            console.log('[Main] Book server stopped');
        });
    }
    
    // On macOS, apps typically stay active until user quits explicitly
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    // Ensure book server is stopped on quit
    if (bookServer) {
        bookServer.close();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        console.log('[Main] Blocked new window:', navigationUrl);
    });
});
