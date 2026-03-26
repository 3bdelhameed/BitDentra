const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 3210;
const ROOT = __dirname;
const APP_ID = 'com.bitdentra.desktop';
const APP_ICON = path.join(ROOT, 'icon.png');

let mainWindow = null;
let server = null;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.sql': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
};

function resolvePath(urlPath) {
    const cleanPath = decodeURIComponent((urlPath || '/').split('?')[0]);
    const relativePath = cleanPath === '/' ? 'login.html' : cleanPath.replace(/^\/+/, '');
    const fullPath = path.normalize(path.join(ROOT, relativePath));
    if (!fullPath.startsWith(ROOT)) return null;
    return fullPath;
}

function startStaticServer() {
    return new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
            const filePath = resolvePath(req.url);
            if (!filePath) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            fs.stat(filePath, (statErr, stats) => {
                if (statErr || !stats.isFile()) {
                    res.writeHead(404);
                    res.end('Not Found');
                    return;
                }

                const ext = path.extname(filePath).toLowerCase();
                const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
                res.writeHead(200, {
                    'Content-Type': mimeType,
                    'Cache-Control': 'no-cache'
                });

                const stream = fs.createReadStream(filePath);
                stream.on('error', () => {
                    res.writeHead(500);
                    res.end('Internal Server Error');
                });
                stream.pipe(res);
            });
        });

        server.once('error', reject);
        server.listen(PORT, HOST, () => resolve());
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 960,
        minWidth: 1100,
        minHeight: 760,
        autoHideMenuBar: true,
        backgroundColor: '#f1f5f9',
        icon: APP_ICON,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadURL(`http://${HOST}:${PORT}/login.html`);
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(async () => {
    app.setAppUserModelId(APP_ID);
    await startStaticServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
    if (server) {
        try { server.close(); } catch (_) {}
    }
});
