import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Keep track of registered listeners to avoid duplicates
const listeners = new Map()

contextBridge.exposeInMainWorld('electronAPI', {
  receive: (channel, func) => {
    // Remove any existing listener for this channel
    if (listeners.has(channel)) {
      ipcRenderer.removeListener(channel, listeners.get(channel))
    }
    
    // Create a wrapper function to pass to ipcRenderer
    const listener = (event, ...args) => func(...args)
    
    // Store the listener reference so we can remove it later
    listeners.set(channel, listener)
    
    // Add the new listener
    ipcRenderer.on(channel, listener)
  },
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  }
})

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}