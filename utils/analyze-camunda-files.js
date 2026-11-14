const fs = require('fs');

// Opening tags: any namespace prefix, attributes in any order, across
// lines. Only well-formed name="value" pairs are consumed, so a literal
// > inside an attribute value cannot end the match early.
const TAG_ATTRIBUTES = '((?:\\s+[A-Za-z0-9_.:-]+\\s*=\\s*(?:"[^"]*"|\'[^\']*\'))*)\\s*/?>';
const PROCESS_TAG = new RegExp('<(?:[A-Za-z0-9_.-]+:)?process' + TAG_ATTRIBUTES, 'g');
const DECISION_TAG = new RegExp('<(?:[A-Za-z0-9_.-]+:)?decision' + TAG_ATTRIBUTES, 'g');

// Anchored on whitespace or the start, so camunda:id or xsi:name are not
// mistaken for id or name.
const ID_ATTRIBUTE = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const NAME_ATTRIBUTE = /(?:^|\s)name\s*=\s*(?:"([^"]*)"|'([^']*)')/;


const analyzeCamundafiles = (filePaths) => {

    //you need to filter
    //then know the type

    const filteredPaths = filePaths.filter(path => path.endsWith('.dmn') || path.endsWith('.bpmn'))

    let fileModels = filteredPaths.map(path => {

        const content = readFileContent(path);
        if(content == null){
            return null;
        }
        const fileType = path.endsWith('.dmn')? 'dmn': 'bpmn';
        const founds = extractModels(content, fileType);

        const models = founds.map(found => {

            return {
                id: found.id,
                name: found.name,
                path: path,
                type: fileType,
            }
        });

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

const attributeValue = (pattern, attributes) => {

    const match = pattern.exec(attributes);

    if(match == null){
        return undefined;
    }

    // group 1 is the double-quoted form, group 2 the single-quoted one
    return match[1] !== undefined ? match[1] : match[2];
}

const extractModels = (content, fileType) => {

    const tagPattern = fileType == 'dmn' ? DECISION_TAG : PROCESS_TAG;
    tagPattern.lastIndex = 0;

    const found = [];
    let match;

    while((match = tagPattern.exec(content)) !== null){

        const attributes = match[1] || '';
        const id = attributeValue(ID_ATTRIBUTE, attributes);

        // A tag with no id is not a definition we can navigate to.
        if(id === undefined){
            continue;
        }

        found.push({
            id: id,
            name: attributeValue(NAME_ATTRIBUTE, attributes)
        });
    }

    return found;
}


module.exports = {
	analyzeCamundafiles: analyzeCamundafiles
}
