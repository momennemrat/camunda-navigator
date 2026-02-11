const fs = require('fs');
const path = require('path');

const dataStoragePath = path.join(__dirname , 'storage.txt');

console.log('storage file location:', dataStoragePath);

function loadStorage(){
    try {
        if (fs.existsSync(dataStoragePath)) {
            const fileData = fs.readFileSync(dataStoragePath, 'utf8');
            return JSON.parse(fileData);
        }
    } catch(error){

    }
    
    return {}; // Return empty object if file doesn't exist
}

function saveStorage(data){
    const jsonString = JSON.stringify(data, null, 2); // null, 2 adds formatting
    fs.writeFileSync(dataStoragePath, jsonString, 'utf8');
}

module.exports = {
	loadStorage: loadStorage,
    saveStorage: saveStorage
}