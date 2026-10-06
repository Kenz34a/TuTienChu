const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld(
  'vanTienDesktop',
  Object.freeze({
    platform: 'pc',
    exportSave: (raw) => ipcRenderer.invoke('export-save', raw),
  }),
);
