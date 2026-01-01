import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let ideProcess: ChildProcess | null = null;
let webProcess: ChildProcess | null = null;

const WEB_PORT = 3000;
const IDE_PORT = 8080;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset', // Mac-style seamless titlebar
    backgroundColor: '#0A0A0A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev
    ? `http://localhost:${WEB_PORT}`
    : `http://localhost:${WEB_PORT}`; // In prod, we might serve static file or local server

  // Wait for web server to be ready before loading
  setTimeout(() => {
     mainWindow?.loadURL(startUrl);
  }, 3000); // Simple delay for MVP, ideally use 'wait-on' logic

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startServices() {
  console.log('Starting OdaxAI Local Engine...');

  // Start IDE Backend (code-server)
  // We need to run it with CORS allowed so the Web App (on different port/domain) can embed it.
  const rootDir = path.resolve(__dirname, '../../..'); 
  
  if (isDev) {
    // In Dev: Setup and run scripts from apps/ide
    console.log('Starting IDE Backend on port ' + IDE_PORT + '...');
    
    // We use a custom command to inject the arguments we need for "Server Mode"
    // Note: code-server < 4.10 might need specific proxy config or --disable-x-frame-options (if available, mostly deprecated).
    // The most reliable way for embedding is ensuring auth is none and frame-ancestors are allowed/ignored.
    // However, code-server security default prevents generic embedding.
    // For this MVP, we rely on the fact we are localhost.
    
    // Using the script we created but modifying flags via env or args if possible.
    // Actually, let's spawn the binary directly if we can, or just use the script.
    // Let's stick to the script but ensure config.yaml has what we need, OR override here.
    
    ideProcess = spawn('pnpm', ['run', 'start:ide', '--', 
      '--auth', 'none', 
      '--disable-telemetry', 
      '--bind-addr', `127.0.0.1:${IDE_PORT}`
      // Note: code-server doesn't have a simple --allow-embedding flag, usually handled by reverse proxy.
      // But for localhost iframe, it often works if SameOrigin policies aren't strict.
      // We will proxy it via Next.js if direct embedding fails, but user wants "Desktop as Server".
    ], {
        cwd: rootDir,
        shell: true,
        stdio: 'inherit'
    });
    
    // Start Web Frontend (The UI)
    console.log('Starting Web Frontend on port ' + WEB_PORT + '...');
    webProcess = spawn('pnpm', ['run', 'start:web'], {
        cwd: rootDir,
        shell: true,
        stdio: 'inherit'
    });
  } else {
    // Prod logic placeholder
    console.log('Production mode service startup not yet implemented.');
  }
}

function stopServices() {
  if (ideProcess) ideProcess.kill();
  if (webProcess) webProcess.kill();
}

app.on('ready', () => {
  startServices();
  createWindow();
});

app.on('window-all-closed', () => {
  stopServices();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
    stopServices();
});
