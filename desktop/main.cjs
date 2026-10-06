const { app, BrowserWindow, protocol, ipcMain, dialog } = require('electron');
const { readFile, writeFile } = require('node:fs/promises');
const { resolve, join, extname, sep } = require('node:path');

const ORIGIN = 'vantien://app';
const webDir = app.isPackaged ? resolve(__dirname, 'web') : resolve(__dirname, '../dist');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vantien',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);
// HTTP user-agent product names must be ASCII. The visible window title stays Vietnamese.
app.setName('VanTienKy');
let window;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};
const csp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 380,
    minHeight: 600,
    title: 'Vân Tiên Ký',
    backgroundColor: '#f6f4e9',
    icon: join(webDir, 'icon-512.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN + '/')) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    window = undefined;
  });
  window.loadURL(ORIGIN + '/');
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.whenReady().then(() => {
    protocol.handle('vantien', async (request) => {
      try {
        const url = new URL(request.url);
        if (url.hostname !== 'app' || request.method !== 'GET')
          return new Response('Not found', { status: 404 });
        const path = resolve(
          webDir,
          '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
        );
        if (!path.startsWith(webDir + sep)) return new Response('Forbidden', { status: 403 });
        const bytes = await readFile(path);
        return new Response(bytes, {
          headers: {
            'Content-Type': mime[extname(path)] || 'application/octet-stream',
            'Content-Security-Policy': csp,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    });
    ipcMain.handle('export-save', async (event, raw) => {
      if (
        !window ||
        event.sender !== window.webContents ||
        !event.senderFrame.url.startsWith(ORIGIN + '/') ||
        typeof raw !== 'string' ||
        Buffer.byteLength(raw, 'utf8') > 250000
      )
        return { saved: false, error: 'Bản lưu không hợp lệ hoặc quá lớn.' };
      try {
        const choice = await dialog.showSaveDialog(window, {
          title: 'Xuất bản lưu Vân Tiên Ký',
          defaultPath: join(
            app.getPath('documents'),
            `van-tien-ky-${new Date().toISOString().slice(0, 10)}.json`,
          ),
          filters: [{ name: 'Bản lưu JSON', extensions: ['json'] }],
        });
        if (choice.canceled || !choice.filePath) return { saved: false };
        await writeFile(choice.filePath, raw, { encoding: 'utf8', mode: 0o600 });
        return { saved: true };
      } catch {
        return { saved: false, error: 'Không thể ghi tệp bản lưu. Hãy chọn thư mục khác.' };
      }
    });
    createWindow();
    app.on('activate', () => {
      if (!BrowserWindow.getAllWindows().length) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
