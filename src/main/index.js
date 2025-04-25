import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import * as path from 'path'
import { spawn } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import WebSocket from 'ws'

const platform = require('os')

// Go up one level from index.js (src/main) to src, then up again to root, then to stockfish folder
const stockfishPath = platform == "win32" ? 'C:\\Users\\virtu\\Downloads\\stockfish-windows-x86-64-avx2\\stockfish\\stockfish-windows-x86-64-avx2.exe': "./stockfish/stockfishLinux/stockfish-ubuntu-x86-64-avx2"

let stockfishProcess;

// Initialize Stockfish process
function initStockfish() {
  try {
    stockfishProcess = spawn(stockfishPath);
    
    stockfishProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stockfish-output', output);
      }
    });

    stockfishProcess.stderr.on('data', (data) => {
      console.error(`Stockfish Error: ${data}`);
    });

    stockfishProcess.on('close', (code) => {
      console.log(`Stockfish process exited with code ${code}`);
      stockfishProcess = null;
    });

    console.log('Stockfish engine initialized successfully');
  } catch (error) {
    console.error('Failed to start Stockfish:', error);
  }
}

// IPC handlers for communication with the renderer process
ipcMain.on('stockfish-command', (_, command) => {
  if (stockfishProcess && !stockfishProcess.killed) {
    stockfishProcess.stdin.write(command + '\n');
  }
});

app.on('before-quit', () => {
  if (stockfishProcess && !stockfishProcess.killed) {
    stockfishProcess.kill();
  }
});

let mainWindow;
let wss;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 350,
    height: 200,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // mainWindow.setAlwaysOnTop(true, "screen");
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function startWebsocketServer() {
  wss = new WebSocket.Server({port: 8080});
  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
      let str = '';
      for (let i = 0; i < message.length; i++) {
        str += String.fromCharCode(message[i]);
      }

      console.log('Received in backend:', str);
      
      if (mainWindow) {
        mainWindow.webContents.send('ws-message', message);
      }
    // Add this: send an acknowledgment back to the client
    ws.send('ack:' + str);
      
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  // ipcMain.on('ping', () => console.log('pong'))
  // ipcMain.on("close-window", ()=>{
  //   const currentWindow = BrowserWindow.getFocusedWindow();
  //   if (currentWindow) {
  //     currentWindow.close()
  //   }
  // })

  // ipcMain.on("minimize-window", ()=>{
  //   const currentWindow = BrowserWindow.getFocusedWindow();
  //   if (currentWindow) {
  //     currentWindow.minimize()
  //   }
  // })
  createWindow()
  initStockfish()
  startWebsocketServer();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
