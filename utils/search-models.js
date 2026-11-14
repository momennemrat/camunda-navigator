const electron = require('electron');
const path = require('path');
const BrowserWindow = electron.BrowserWindow;

let modalWindow = null;

function openSearchModal(){

    if(modalWindow && !modalWindow.isDestroyed()){

        if(modalWindow.isMinimized()){
            modalWindow.restore();
        }

        modalWindow.focus();
        return modalWindow;
    }

    const window = new BrowserWindow({
        useContentSize: true,
        width: 560,
        height: 420,
        minimizable: false,
        maximizable: false,
        parent: BrowserWindow.getFocusedWindow(),
        resizable: false,
        fullscreenable: false,
        autoHideMenuBar: true,
        title: 'Search definitions',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'search-preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    modalWindow = window;

    window.on('closed', () => {
        if(modalWindow === window){
            modalWindow = null;
        }
    });

    window.loadFile(path.join(__dirname , 'search-modal.html'));

    window.once('ready-to-show', () => {
        window.show();
        //window.webContents.openDevTools();
    });

    return window;
}

function closeSearchModal(){

    if(modalWindow && !modalWindow.isDestroyed()){
        modalWindow.close();
    }
}


module.exports = {
	openSearchModal: openSearchModal,
	closeSearchModal: closeSearchModal
}
