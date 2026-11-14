const fs = require('fs');
const path = require('path');
const electron = require('electron');
const app = electron.app;

const dataStoragePath = path.join(app.getPath('userData'), 'camunda-navigator-storage.json');

console.log('storage file location:', dataStoragePath);

function loadStorage(){
    try {
        if (fs.existsSync(dataStoragePath)) {
            const fileData = fs.readFileSync(dataStoragePath, 'utf8');
            return JSON.parse(fileData);
        }
    } catch(error){
        console.warn('Could not read settings from ' + dataStoragePath + ': ' + error.message);
    }
    
    return {}; // Return empty object if file doesn't exist
}

function saveStorage(data){
    try {
        const jsonString = JSON.stringify(data, null, 2); // null, 2 adds formatting
        fs.writeFileSync(dataStoragePath, jsonString, 'utf8');
        return true;
    } catch(error){
        console.warn('Could not save settings to ' + dataStoragePath + ': ' + error.message);
        return false;
    }
}

module.exports = {
	loadStorage: loadStorage,
    saveStorage: saveStorage
}
