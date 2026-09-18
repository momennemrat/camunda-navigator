const fs = require('fs');


const analyzeCamundafiles = (filePaths) => {

    //you need to filter
    //then know the type

    const filteredPaths = filePaths.filter(path => path.endsWith('.dmn') || path.endsWith('.bpmn'))

    let fileModels = filteredPaths.map(path => {

        const content = readFileContent(path);
        if(!content){
            return null;
        }
        const fileType = path.endsWith('.dmn')? 'dmn': 'bpmn';
        let founds = null;
        let models = [];

        if(fileType == 'bpmn'){
            founds = [...content.matchAll(/<bpmn:process[ ]+id="([^"]*)"(?:[ ]+name="([^"]*))?/g)];
        } else if(fileType == 'dmn') {
            founds = [...content.matchAll(/<decision id="([^"]*)"(?:[ ]+name="([^"]*))?/g)];
        }

        if(founds?.length){
            models = founds.map(found => {

                return {
                    id: found[1],
                    name: found[2],
                    path: path,
                    type: fileType,
                }
            })
        }

        return {
            path: path,
            type: fileType,
            models: models,
        }
    })
    .filter(fileModel => fileModel);

    const unreadableCount = filteredPaths.length - fileModels.length;
    if(unreadableCount > 0){
        console.warn('Skipped ' + unreadableCount + ' unreadable BPMN/DMN file(s).');
    }

    let models = fileModels.map(fileModel => fileModel.models).flat();


    return models;
}


// One unreadable file must not abort indexing the whole folder.
const readFileContent = (filePath)=> {

    try {
        return fs.readFileSync(filePath, {encoding: 'utf-8'});
    } catch(error){
        console.warn('Cannot read file, skipping: ' + filePath + ' (' + error.message + ')');
        return null;
    }
}


module.exports = {
	analyzeCamundafiles: analyzeCamundafiles
}
