const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const { createServer } = http;
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const host = '127.0.0.1';
const port = 4317;
const appRoot = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
const serverEntry = path.join(appRoot, 'crafting-ui', 'server.mjs');
let serverProcess;
let window;
let ownsServer = false;

function isServerReady() {
  return new Promise((resolve) => {
    const socket = createServer();
    socket.once('error', (error) => resolve(error.code === 'EADDRINUSE'));
    socket.listen(port, host, () => socket.close(() => resolve(false)));
  });
}

function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const probe = () => {
      const request = http.get(`http://${host}:${port}/`, (response) => {
        response.resume();
        if (response.statusCode === 200) resolve();
        else retry();
      });
      request.setTimeout(750, () => request.destroy());
      request.once('error', retry);
    };
    const retry = () => {
      if (Date.now() >= deadline) reject(new Error('The local app server did not start.'));
      else setTimeout(probe, 250);
    };
    probe();
  });
}

async function startServer() {
  if (await isServerReady()) return;
  ownsServer = true;
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: appRoot,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
  serverProcess.once('error', (error) => console.error('Unable to launch the local app server:', error));
  serverProcess.once('exit', (code) => {
    if (ownsServer && !app.isQuitting && code && window && !window.isDestroyed()) {
      dialog.showErrorBox('Exile Companion', `The local app server stopped (code ${code}).`);
      app.quit();
    }
  });
  await waitForServer();
}

function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    title: 'Exile Companion',
    backgroundColor: '#0b1114',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://${host}:${port}/`)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://${host}:${port}/`)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
  window.loadURL(`http://${host}:${port}/`);
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (error) {
    dialog.showErrorBox('Exile Companion could not start', error.message);
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
