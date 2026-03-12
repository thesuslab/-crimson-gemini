import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Persists save directory for the session
let saveDir: string | null = null;
const getEffectiveSaveDir = () => saveDir ?? app.getPath('pictures');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (process.platform === 'win32' && require('electron-squirrel-startup')) {
    app.quit();
}

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (!app.isPackaged) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('trigger-shutter', async () => {
        console.log('Shutter triggered!');
        // Ideally this comes from a config, for now we'll use a default or mock
        // TODO: Externalize this to a config file
        const shutterCommand = 'mock-shutter.bat';

        return new Promise((resolve, reject) => {
            exec(shutterCommand, { cwd: process.cwd() }, (error: Error | null, stdout: string, stderr: string) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    // We don't verify the error here strictly for the photo booth app flow,
                    // as we want to save the digital photo regardless of the DSLR trigger status
                    console.warn("DSLR shutter trigger failed, but proceeding.");
                }
                console.log(`stdout: ${stdout}`);
                if (stderr) console.error(`stderr: ${stderr}`);
                resolve({ success: true, output: stdout });
            });
        });
    });

    // --- Save folder picker ---
    ipcMain.handle('choose-save-dir', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Choose Photo Save Folder',
            defaultPath: getEffectiveSaveDir(),
        });
        if (!result.canceled && result.filePaths.length > 0) {
            saveDir = result.filePaths[0];
        }
        return { dir: getEffectiveSaveDir() };
    });

    ipcMain.handle('get-save-dir', () => ({ dir: getEffectiveSaveDir() }));

    ipcMain.handle('save-photo', async (event, dataUrl: string) => {
        try {
            const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                return { success: false, error: 'Invalid data URL' };
            }

            const buffer = Buffer.from(matches[2], 'base64');
            const picturesDir = getEffectiveSaveDir();
            const fileName = `crimson-gemini-${Date.now()}.png`;
            const filePath = path.join(picturesDir, fileName);

            const fs = require('fs');
            await fs.promises.writeFile(filePath, buffer);

            console.log(`Photo saved to ${filePath}`);
            return { success: true, filePath };
        } catch (error: any) {
            console.error("Error saving photo:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('log', (event, message) => {
        console.log(`[Renderer]: ${message}`);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
