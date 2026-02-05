/**
 * Type definitions for Electron IPC API
 * Exposed via window.electronAPI in the renderer process
 */

export interface ElectronAPI {
  /**
   * Get the user data path from Electron app
   */
  getAppPath(): Promise<string>

  /**
   * Save an EPUB file to the filesystem
   * @param id - Book ID
   * @param arrayBuffer - Book file content
   */
  saveBookFile(id: string, arrayBuffer: ArrayBuffer): Promise<{ success: boolean; source: string }>

  /**
   * Delete an EPUB file from the filesystem
   * @param id - Book ID
   */
  deleteBookFile(id: string): Promise<boolean>

  /**
   * Get the port of the local HTTP server serving EPUB files
   */
  getBookServerPort(): Promise<number>

  /**
   * Window controls
   */
  minimize(): Promise<void>
  maximize(): Promise<void>
  close(): Promise<void>
}

/**
 * Extend the Window interface to include electronAPI
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
