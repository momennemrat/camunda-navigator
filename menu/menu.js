'use strict';
const { fetchDeepFileNames } = require('../utils/fetch-files.js');
const { analyzeCamundafiles } = require('../utils/analyze-camunda-files.js');
const { loadStorage, saveStorage } = require('../utils/storage.js');
const { openSearchModal } = require('../utils/search-models.js');
const electron = require('electron');
const dialog = electron.dialog;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const { shell } = require('electron');

const KeyboardShortcuts = {
  goToElementDefinition: 'CommandOrControl+g',
  goToElementDefinitionNewWay: 'CommandOrControl+h',
  searchDefinitions: 'CommandOrControl+q',
  resetRootFolder: 'CommandOrControl+r'
}

const lables = {
  goToElementDefinition: 'Go to element definition',
  goToElementDefinitionNewWay: 'Go to element definition (force open)',
  searchDefinitions: 'Search definitions',
  resetRootFolder: 'Reset root folder for definitions (BPMN/DMN)'
}

const AlertMessages = {
  chooseRootFolderFirst: 'Choose root folder that contains all definitions (BPMNs and DMNs)',
  noSelected: 'No process/decision selected!',
  noDefinitionsFoundForSelectedelement: 'No definitions found for selected element!',
  noDefinitionsFoundInFolder: 'No definitions found in the selected folder and sub-folders!'
}


let models = [];
let rootPath = null;
let storage = {};
let modalWindow;

let isAppLoaded = false;
let lateLogs = [];


app.once('app:client-ready', function() {
  isAppLoaded = true;
  lateLogs.forEach(message => {
    log('(late message) ' + message);
  });
});

function startUp(){

  storage = loadStorage();
  rootPath = storage.rootPath;
  
  if(rootPath != null){
    log('path found:', rootPath);
    loadDirectory();
  }
}

ipcMain.on('search-modal-action', (event, id) => {
  modalWindow.close();
  shell.openPath(id);
});

ipcMain.handle('get-models', async (event, data) => {
  return models;
});


startUp();




module.exports = function(electronApp, menuState) {
  return [
    {
      label: lables.goToElementDefinition,
      accelerator: KeyboardShortcuts.goToElementDefinition,
      enabled: () => menuState.elementsSelected,
      action: async () => { searchDefinitionOldWay(); }
    },

    {
      label: lables.goToElementDefinitionNewWay,
      accelerator: KeyboardShortcuts.goToElementDefinitionNewWay,
      enabled: () => menuState.elementsSelected,
      action: async () => { searchDefinitionNewWay(); }
    },

    {
      label: lables.searchDefinitions,
      accelerator: KeyboardShortcuts.searchDefinitions,
      action: async () => { modalWindow = openSearchModal(); }
    },

    {
      label: lables.resetRootFolder,
      accelerator: KeyboardShortcuts.resetRootFolder,
      action: async () => { await initDirectory(); }
    },
  ];
};


//Helpers

async function initDirectory(){

  const folderPath = selectDirectory();
  rootPath = folderPath
  storage.rootPath = rootPath;
  saveStorage(storage);
  showMessage('path: ' + rootPath);
  await loadDirectory();
  if(models.length == 0){
    showMessage(AlertMessages.noDefinitionsFoundInFolder);
  }
}

function selectDirectory() {
  const window = BrowserWindow.getFocusedWindow(); // Get the current focused window
  const result = dialog.showOpenDialogSync(window, {
    title: 'Please choose the root folder for all BPMN/DMN files', // The message/title
    properties: ['openDirectory'] // Specify that only directories can be selected
  });

  if (result.canceled) {
    log('Folder selection cancelled');
    return null;
  } else {
    const folderPath = result[0];
    log('Selected folder path:', folderPath);
    return folderPath;
  }
}

async function loadDirectory(){
  
  log('storage folder path: '+ rootPath);
  const paths = fetchDeepFileNames(rootPath);
  models = analyzeCamundafiles(paths)?? [];
  
  //showMessage('models found: ' + models.length);
}

async function searchDefinitionOldWay(){
  if(rootPath == null){
    showMessage(AlertMessages.chooseRootFolderFirst)
    await initDirectory();
  }
  
  const  processId = await app.mainWindow.webContents.executeJavaScript(`document.querySelector('#bio-properties-panel-targetProcessId')?.value`);
  const  decisionId = await app.mainWindow.webContents.executeJavaScript(`document.querySelector('#bio-properties-panel-decisionId')?.value`);
  console.log('found processId:', processId);
  console.log('found decisionId:', decisionId);

  if(!processId && !decisionId){

    showMessage(AlertMessages.noSelected);
    return;
  }

  const targetId = processId?? decisionId;
  const targetModel = models.filter(model => model.ids.includes(targetId))[0];

  if(!targetModel){

    showMessage(AlertMessages.noDefinitionsFoundForSelectedelement);
    return;
  }

  log('target model found:', targetModel.path);

  const normalizedPath = targetModel.path.replace(/\\/g, '/');
  app.emit('menu:action', 'open-diagram', {filePath: normalizedPath});
}

async function searchDefinitionNewWay(){
  if(rootPath == null){
    showMessage(AlertMessages.chooseRootFolderFirst)
    await initDirectory();
  }
  
  const  processId = await app.mainWindow.webContents.executeJavaScript(`document.querySelector('#bio-properties-panel-targetProcessId')?.value`);
  const  decisionId = await app.mainWindow.webContents.executeJavaScript(`document.querySelector('#bio-properties-panel-decisionId')?.value`);
  console.log('found processId:', processId);
  console.log('found decisionId:', decisionId);

  if(!processId && !decisionId){

    showMessage(AlertMessages.noSelected);
    return;
  }

  const targetId = processId?? decisionId;
  const targetModel = models.filter(model => model.ids.includes(targetId))[0];

  if(!targetModel){

    showMessage(AlertMessages.noDefinitionsFoundForSelectedelement);
    return;
  }

  log('target model found:', targetModel.path);

  shell.openPath(targetModel.path);
}

const showMessage = (message) => {

  const options = {
    type: 'info',
    message: message,
    buttons: ['OK', 'Close']
  };

  // Returns the index of the clicked button
  const buttonIndex = dialog.showMessageBoxSync(options);
}

function log(...args){

  args = args?? [''];
  
  let message = '' + args.join(' ');

  if(!isAppLoaded){
    console.log('app is not loaded !, trying to log:', message)
    lateLogs.push(message);
    return;
  }
  app.emit('menu:action', 'log', {
    category: 'warning',
    message: message,
    silent: false
  });
}