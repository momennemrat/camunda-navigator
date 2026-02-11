const fs = require('fs');
const path = require('path');


const analyzeCamundafiles = (filePaths) => {

    //you need to filter
    //then know the type

    const filteredPaths = filePaths.filter(path => path.endsWith('.dmn') || path.endsWith('.bpmn'))

    let fileModels = filteredPaths.map(path => {
        return {
            path: path,
            fileName: '',
            content: readFileContent(path),
            type: path.endsWith('.dmn')? 'dmn': 'bpmn',
            ids: [],
            names: []
        }
    })
    .filter(fileModel => fileModel.content);

    fileModels.forEach(fileModel => {

        let founds = null;
        let onlyIds = null;
        
        if(fileModel.type == 'bpmn'){
            founds = fileModel.content.match(/<bpmn:process id="([^"]*)" name="([^"]*)"/g)?.map(f => f.match(/<bpmn:process id="([^"]*)" name="([^"]*)"/));
            onlyIds = fileModel.content.match(/<bpmn:process id="([^"]*)"/g)?.map(f => f.match(/<bpmn:process id="([^"]*)"/));
        } else if(fileModel.type == 'dmn') {
            founds = fileModel.content.match(/<decision id="([^"]*)" name="([^"]*)"/g)?.map(f => f.match(/<decision id="([^"]*)" name="([^"]*)"/));
            onlyIds = fileModel.content.match(/<decision id="([^"]*)"/g)?.map(f => f.match(/<decision id="([^"]*)"/));
        }

        if(founds?.length){
            founds.forEach(found => {
                if(found.length > 1){
                    fileModel.ids.push(found[1]);

                    if(found.length > 2){
                        fileModel.names.push(found[2]);
                    }
                }
            });
        }

        if(onlyIds?.length){
            onlyIds.forEach(onlyId => {
                if(onlyId.length > 1){
                    fileModel.ids.push(onlyId[1]);
                }
            });
        }

        if(fileModel.ids){
            fileModel.ids = [...new Set(fileModel.ids)];
        }

        if(fileModel.names){
            fileModel.names = [...new Set(fileModel.names)];
        }
        
    });

    const failedModels = fileModels.filter(model => model.ids.length == 0);

    debugger;

    return fileModels;
}



const readFileContent = (filePath)=> {

    const readedContent = fs.readFileSync(filePath, {encoding: 'utf-8'});
    return readedContent;
}


module.exports = {
	analyzeCamundafiles: analyzeCamundafiles
}