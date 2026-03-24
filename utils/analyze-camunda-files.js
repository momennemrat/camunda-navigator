const fs = require('fs');
const path = require('path');


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
                    fileName: '',
                    type: fileType,
                }
            })
        }

        return {
            path: path,
            fileName: '',
            type: fileType,
            models: models,
        }
    })
    .filter(fileModel => fileModel);

    const failedModels = fileModels.filter(model => model.models.length == 0);

    let models = fileModels.map(fileModel => fileModel.models).flat();


    return models;
}



const readFileContent = (filePath)=> {

    const readedContent = fs.readFileSync(filePath, {encoding: 'utf-8'});
    return readedContent;
}


module.exports = {
	analyzeCamundafiles: analyzeCamundafiles
}