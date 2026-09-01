const fs = require('fs');
const path = require('path');


const fetchDeepFileNames = (folderPath, maxDepth = 20) => {

    errorIfPathNotExist(folderPath);
    errorIfNotFolder(folderPath);

    return readFolderRecursion(folderPath, maxDepth);
}

const readFolderRecursion = (folderPath, depth) => {

    if(depth <= 0){
        console.warn('Max folder depth reached, skipping: ' + folderPath);
        return [];
    }

    errorIfPathNotExist(folderPath);
    errorIfNotFolder(folderPath);

    const folderContent = fs.readdirSync(folderPath);
    const fullPaths = folderContent.map(name => path.join(folderPath, name));
    const onlyFolders = fullPaths.filter(fullPath => !fs.lstatSync(fullPath).isFile());
    const onlyFiles = fullPaths.filter(fullPath => fs.lstatSync(fullPath).isFile());

    let groupedFiles = onlyFiles.slice();

    if(onlyFolders.length > 0){
        groupedFiles = groupedFiles.concat(onlyFolders.map(subFolderFullPath => readFolderRecursion(subFolderFullPath, depth - 1)).flat());
    }

    return groupedFiles;
}


const errorIfPathNotExist = (path) => {
    if(!fs.existsSync(path)){

        ///TODO: make all errors constant based
        console.error('Specefied path is not exist. ' + path);
        return;
    }
}

const errorIfNotFolder = (path) => {

    if(fs.lstatSync(path).isFile()){

        ///TODO: make all errors constant based
        console.error('Specefied path is not exist. ' + path);
        return;
    }
}

module.exports = {
	fetchDeepFileNames: fetchDeepFileNames
}
