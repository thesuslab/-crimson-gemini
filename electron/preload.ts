import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    triggerShutter: () => ipcRenderer.invoke('trigger-shutter'),
    savePhoto: (dataUrl: string) => ipcRenderer.invoke('save-photo', dataUrl),
    log: (message: string) => ipcRenderer.send('log', message),
});
