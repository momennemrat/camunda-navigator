const electron = require('electron');
const path = require('path');
const BrowserWindow = electron.BrowserWindow;

function openSearchModal(){
  
    let modalWindow = new BrowserWindow({
    show: false,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
    }
    });
    modalWindow.loadFile(path.join(__dirname , 'search-modal.html'));

    modalWindow.once('ready-to-show', () => {
        modalWindow.show();
        //modalWindow.webContents.openDevTools();
    });

    return modalWindow;
}


module.exports = {
	openSearchModal: openSearchModal
}
