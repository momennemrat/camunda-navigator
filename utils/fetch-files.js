const fs = require('fs');
const path = require('path');


const DEFAULT_MAX_DEPTH = 20;
const DEFAULT_EXCLUDED_FOLDERS = [];
const DEFAULT_EXTENSIONS = null;

const ErrorMessages = {
    pathNotExist: (target) => 'Path does not exist: ' + target,
    notAFolder: (target) => 'Path is not a folder: ' + target
}


const fetchDeepFileNames = (folderPath, options = {}) => {

    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const excludedFolders = options.excludedFolders ?? DEFAULT_EXCLUDED_FOLDERS;
    const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
    const allowedExtensions = extensions
        ? extensions.map(ext => ext.toLowerCase())
        : null;

    errorIfPathNotExist(folderPath);
    errorIfNotFolder(folderPath);

    const excluded = new Set(excludedFolders.map(name => name.toLowerCase()));
    const visitedFolders = new Set();

    return readFolderRecursion(folderPath, maxDepth, excluded, visitedFolders, allowedExtensions);
}

const readFolderRecursion = (folderPath, depth, excluded, visitedFolders, allowedExtensions) => {

    if(depth <= 0){
        console.warn('Max folder depth reached, skipping: ' + folderPath);
        return [];
    }

    const realPath = safeRealPath(folderPath);
    if(realPath == null || visitedFolders.has(realPath)){
        return [];
    }
    visitedFolders.add(realPath);

    let entries;
    try {
        entries = fs.readdirSync(folderPath, { withFileTypes: true });
    } catch(error){
        console.warn('Cannot read folder, skipping: ' + folderPath + ' (' + error.message + ')');
        return [];
    }

    let files = [];

    entries.forEach(entry => {

        const fullPath = path.join(folderPath, entry.name);
        const isFolder = isFolderEntry(entry, fullPath);

        if(isFolder){

            if(excluded.has(entry.name.toLowerCase())){
                return;
            }

            files = files.concat(readFolderRecursion(fullPath, depth - 1, excluded, visitedFolders, allowedExtensions));
            return;
        }

        if(allowedExtensions && !allowedExtensions.some(ext => entry.name.toLowerCase().endsWith(ext))){
            return;
        }

        files.push(fullPath);
    });

    return files;
}

const isFolderEntry = (entry, fullPath) => {

    if(entry.isDirectory()){
        return true;
    }

    if(!entry.isSymbolicLink()){
        return false;
    }

    try {
        return fs.statSync(fullPath).isDirectory();
    } catch(error){
        return false;
    }
}

const safeRealPath = (folderPath) => {
    try {
        return fs.realpathSync(folderPath);
    } catch(error){
        console.warn('Cannot resolve folder, skipping: ' + folderPath + ' (' + error.message + ')');
        return null;
    }
}


const errorIfPathNotExist = (target) => {
    if(!fs.existsSync(target)){
        throw new Error(ErrorMessages.pathNotExist(target));
    }
}

const errorIfNotFolder = (target) => {
    if(!fs.statSync(target).isDirectory()){
        throw new Error(ErrorMessages.notAFolder(target));
    }
}

module.exports = {
	fetchDeepFileNames: fetchDeepFileNames
}
