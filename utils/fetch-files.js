const fs = require('fs');
const path = require('path');


//import * as fs from 'fs';
//import * as path from 'path';



const fetchDeepFileNames = (folderPath) => {

    errorIfPathNotExist(folderPath);
    errorIfNotFolder(folderPath);

    const filePaths = readFolderRecursion(folderPath);
    //const contents = filePaths.map(path => readFileContent(path));
    return filePaths;
}

const readFolderRecursion = (folderPath, depth = 20) => {

    errorIfPathNotExist(folderPath);
    errorIfNotFolder(folderPath);

    const folderContent = fs.readdirSync(folderPath);
    const fullPaths = folderContent.map(name => path.join(folderPath, name));
    const onlyFolders = fullPaths.filter(fullPath => !fs.lstatSync(fullPath).isFile());
    const onlyFiles = fullPaths.filter(fullPath => fs.lstatSync(fullPath).isFile());

    let groupedFiles = onlyFiles.slice();

    if(onlyFolders.length > 0){
        groupedFiles = groupedFiles.concat(onlyFolders.map(subFolderFullPath => readFolderRecursion(subFolderFullPath, depth-1)).flat());
    }

    return groupedFiles;
}

const readFileContent = (filePath)=> {

    let readedContent = fs.readFileSync(filePath, {encoding: 'utf-8'});

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
