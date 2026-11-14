'use strict';
const { fetchDeepFileNames } = require('../utils/fetch-files.js');
const { analyzeCamundafiles } = require('../utils/analyze-camunda-files.js');
const { loadStorage, saveStorage } = require('../utils/storage.js');
const { openSearchModal, closeSearchModal } = require('../utils/search-models.js');
const electron = require('electron');
const dialog = electron.dialog;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;

const KeyboardShortcuts = {
  goToElementDefinition: 'CommandOrControl+g',
  searchDefinitions: 'CommandOrControl+Shift+f',
  refreshDefinitions: 'CommandOrControl+Shift+r'
}

const MAX_FOLDER_DEPTH = 20;
const DEFINITION_EXTENSIONS = ['.bpmn', '.dmn'];

// Folders never worth scanning for BPMN/DMN definitions.
const EXCLUDED_FOLDERS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.idea',
  '.vscode',
  'target',
  'build',
  'dist',
  'out',
  '.gradle',
  '.mvn'
];

const labels = {
  goToElementDefinition: 'Go to element definition',
  searchDefinitions: 'Search definitions',
  refreshDefinitions: 'Refresh definitions',
  resetRootFolder: 'Reset root folder'
}

const AlertMessages = {
  chooseRootFolderFirst: 'Choose root folder that contains all definitions (BPMNs and DMNs)',
  noSelected: 'No process/decision selected!',
  noDefinitionsFoundForSelectedElement: 'No definitions found for selected element!',
  noDefinitionsFoundInFolder: 'No definitions found in the selected folder and sub-folders!',
  couldNotReadFolder: 'Could not read the definitions folder',
  couldNotReadSelection: 'Could not read the selected element from the Modeler.',
  rootFolderNotSaved: 'Root folder set for this session only. It could not be saved, so the Modeler will forget it on restart.',
  definitionsRefreshed: (count) => 'Definitions refreshed. ' + count + ' found.'
}


let models = [];
let indexPromise = null;
let indexGeneration = 0;
let rootPath = null;
let storage = {};

let isAppLoaded = false;
let lateLogs = [];
let lateMessages = [];


app.once('app:client-ready', function() {
  isAppLoaded = true;

  const queuedLogs = lateLogs;
  const queuedMessages = lateMessages;
  lateLogs = [];
  lateMessages = [];

  queuedLogs.forEach(message => {
    log('(late message) ' + message);
  });

  queuedMessages.forEach(message => {
    showMessage(message);
  });
});

function startUp(){

  storage = loadStorage();
  rootPath = storage.rootPath;
  
  if(rootPath != null){
    log('path found:', rootPath);
    // Module load must return immediately, so the index builds on the next tick.
    setImmediate(() => {
      ensureIndex().catch(error => log('Indexing failed: ' + error.message));
    });
  }
}

ipcMain.on('search-modal-action', (event, id) => {
  closeSearchModal();
  app.emit('menu:action', 'open-diagram', {path: id});
});

ipcMain.handle('get-models', async (event, data) => {
  await ensureIndex();
  return models;
});

ipcMain.handle('get-root-path', async (event) => {
  return rootPath;
});


startUp();




module.exports = function(electronApp, menuState) {
  return [
    {
      label: labels.goToElementDefinition,
      accelerator: KeyboardShortcuts.goToElementDefinition,
      enabled: () => menuState.elementsSelected,
      action: async () => { searchDefinition(); }
    },

    {
      label: labels.searchDefinitions,
      accelerator: KeyboardShortcuts.searchDefinitions,
      action: async () => { openSearchModal(); }
    },

    {
      label: labels.refreshDefinitions,
      accelerator: KeyboardShortcuts.refreshDefinitions,
      action: async () => { await refreshDefinitions(); }
    },

    {
      label: labels.resetRootFolder,
      action: async () => { await initDirectory(); }
    },
  ];
};


//Helpers

async function initDirectory(){

  const folderPath = selectDirectory();

  if(folderPath == null){
    return;
  }

  rootPath = folderPath;
  storage.rootPath = rootPath;

  const saved = saveStorage(storage);

  if(saved){
    showMessage('path: ' + rootPath);
  } else {
    showMessage(AlertMessages.rootFolderNotSaved + ' Path: ' + rootPath);
  }

  invalidateIndex();
  const result = await ensureIndex();

  if(result === 'ok' && models.length == 0){
    showMessage(AlertMessages.noDefinitionsFoundInFolder);
  }
}

async function refreshDefinitions(){

  if(rootPath == null){
    showMessage(AlertMessages.chooseRootFolderFirst);
    return;
  }

  invalidateIndex();
  const result = await ensureIndex();

  if(result === 'failed' || result === 'superseded'){
    // 'failed' was already reported by loadDirectory, 'superseded' means a
    // newer build owns the list now
    return;
  }

  if(models.length == 0){
    showMessage(AlertMessages.noDefinitionsFoundInFolder);
    return;
  }

  showMessage(AlertMessages.definitionsRefreshed(models.length));
}

function selectDirectory() {
  const window = BrowserWindow.getFocusedWindow(); // Get the current focused window
  // showOpenDialogSync returns the selected paths, or undefined when cancelled
  const result = dialog.showOpenDialogSync(window, {
    title: 'Please choose the root folder for all BPMN/DMN files', // The message/title
    properties: ['openDirectory'] // Specify that only directories can be selected
  });

  if (!result || result.length === 0) {
    log('Folder selection cancelled');
    return null;
  }

  const folderPath = result[0];
  log('Selected folder path:', folderPath);
  return folderPath;
}

// Every consumer awaits this one promise, so a folder is never indexed twice
// concurrently and no caller can observe a half-built list.
function ensureIndex(){

  if(rootPath == null){
    return Promise.resolve('no-root');
  }

  if(indexPromise == null){

    const generation = indexGeneration;

    indexPromise = loadDirectory(generation).catch(error => {
      // Do not poison the memo: a later Refresh must be able to retry.
      if(generation === indexGeneration){
        indexPromise = null;
      }
      throw error;
    });
  }

  return indexPromise;
}

function invalidateIndex(){
  indexGeneration++;
  indexPromise = null;
}

async function loadDirectory(generation){

  const folderPath = rootPath;

  log('storage folder path: '+ folderPath);

  let found;

  try {
    const paths = fetchDeepFileNames(folderPath, {
      maxDepth: MAX_FOLDER_DEPTH,
      excludedFolders: EXCLUDED_FOLDERS,
      extensions: DEFINITION_EXTENSIONS
    });
    found = await analyzeCamundafiles(paths)?? [];
  } catch(error){

    // The root changed under us; the newer build owns `models` now.
    if(generation !== indexGeneration){
      return 'superseded';
    }

    models = [];
    log(AlertMessages.couldNotReadFolder + ': ' + error.message);
    showMessage(AlertMessages.couldNotReadFolder + ': ' + error.message);
    return 'failed';
  }

  // selectDirectory opens a native dialog that pumps the event loop, so an
  // older build can finish after a newer root was picked. Never let it publish.
  if(generation !== indexGeneration){
    return 'superseded';
  }

  models = found;
  return 'ok';
}

async function searchDefinition(){
  if(rootPath == null){
    showMessage(AlertMessages.chooseRootFolderFirst)
    await initDirectory();

    if(rootPath == null){
      return;
    }
  }

  let processId;
  let decisionId;

  try {
    processId = await readPanelValue(`
      (
        document.querySelector('#bio-properties-panel-targetProcessId')?.value ||
        // Camunda 7 Selectors
        document.querySelector('#bio-properties-panel-calledElement')?.value ||
        document.querySelector('[data-entry-id="calledElement"] input[name="calledElement"]')?.value ||
        document.querySelector('input[name="calledElement"]')?.value
      )
    `);

    decisionId = await readPanelValue(`
      (
        document.querySelector('#bio-properties-panel-decisionId')?.value ||
        // Camunda 7 Selectors
        document.querySelector('#bio-properties-panel-decisionRef')?.value ||
        document.querySelector('[data-entry-id="decisionRef"] input[name="decisionRef"]')?.value ||
        document.querySelector('input[name="decisionRef"]')?.value
      )
    `);
  } catch(error){
    log('Could not read the properties panel: ' + error.message);
    showMessage(AlertMessages.couldNotReadSelection);
    return;
  }

  console.log('found processId:', processId);
  console.log('found decisionId:', decisionId);

  if(!processId && !decisionId){

    showMessage(AlertMessages.noSelected);
    return;
  }

  const targetId = processId || decisionId;
  await ensureIndex();
  const matches = models.filter(model => model.id === targetId);

  if(matches.length === 0){

    showMessage(AlertMessages.noDefinitionsFoundForSelectedElement);
    return;
  }

  const targetModel = matches[0];

  if(matches.length > 1){
    log('Multiple definitions with the id ' + targetId + ', opening ' + targetModel.path + '. All matches: ' + matches.map(match => match.path).join(', '));
  }

  app.emit('menu:action', 'open-diagram', {path: targetModel.path});
}

// Reads a value out of the Modeler's properties panel. Throws when there is no
// usable window, so callers can tell a failed read from an empty field.
async function readPanelValue(script){

  if(!app.mainWindow || app.mainWindow.isDestroyed()){
    throw new Error('No Modeler window is available.');
  }

  return await app.mainWindow.webContents.executeJavaScript(script);
}

function showMessage(message){


  if(!isAppLoaded){
    console.log('app is not loaded !, queueing message:', message);
    lateMessages.push(message);
    return;
  }

  const options = {
    type: 'info',
    message: message,
    buttons: ['OK', 'Close']
  };

  dialog.showMessageBoxSync(options);
}

function log(...args){

  
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