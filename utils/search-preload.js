const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navigatorApi', {
        getModels: () => ipcRenderer.invoke('get-models', null),
        getRootPath: () => ipcRenderer.invoke('get-root-path'),
        openModel: (modelPath) => ipcRenderer.send('search-modal-action', String(modelPath))
});
