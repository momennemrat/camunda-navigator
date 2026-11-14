const fs = require('fs');

const READ_CONCURRENCY = 8;
const TAG_ATTRIBUTES = '((?:\\s+[A-Za-z0-9_.:-]+\\s*=\\s*(?:"[^"]*"|\'[^\']*\'))*)\\s*/?>';
const PROCESS_TAG = new RegExp('<(?:[A-Za-z0-9_.-]+:)?process' + TAG_ATTRIBUTES, 'g');
const DECISION_TAG = new RegExp('<(?:[A-Za-z0-9_.-]+:)?decision' + TAG_ATTRIBUTES, 'g');
const ID_ATTRIBUTE = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const NAME_ATTRIBUTE = /(?:^|\s)name\s*=\s*(?:"([^"]*)"|'([^']*)')/;


const analyzeCamundafiles = async (filePaths) => {
    
    const filteredPaths = filePaths.filter(path => path.endsWith('.dmn') || path.endsWith('.bpmn'));
    const perFile = new Array(filteredPaths.length).fill(null);
    let next = 0;

    const worker = async () => {

        while(true){

            const index = next++;

            if(index >= filteredPaths.length){
                return;
            }

            const filePath = filteredPaths[index];
            const content = await readFileContent(filePath);

            if(content == null){
                continue;
            }

            const fileType = filePath.endsWith('.dmn')? 'dmn': 'bpmn';

            perFile[index] = extractModels(content, fileType).map(found => {

                return {
                    id: found.id,
                    name: found.name,
                    path: filePath,
                    type: fileType,
                }
            });
        }
    };

    const workerCount = Math.min(READ_CONCURRENCY, filteredPaths.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const unreadableCount = perFile.filter(entry => entry === null).length;
    if(unreadableCount > 0){
        console.warn('Skipped ' + unreadableCount + ' unreadable BPMN/DMN file(s).');
    }

    return perFile.filter(entry => entry !== null).flat();
}

const readFileContent = async (filePath)=> {

    try {
        return await fs.promises.readFile(filePath, {encoding: 'utf-8'});
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

    const value = match[1] !== undefined ? match[1] : match[2];

    return decodeXmlEntities(value);
}

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const XML_ENTITY = /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|(amp|lt|gt|quot|apos));/g;

const decodeXmlEntities = (text) => {

    return text.replace(XML_ENTITY, (whole, decimal, hex, named) => {

        if(named !== undefined){
            return NAMED_ENTITIES[named];
        }

        const code = decimal !== undefined ? parseInt(decimal, 10) : parseInt(hex, 16);

        // Control characters have no place in a one-line label, and
        // fromCodePoint throws above 0x10FFFF, so both stay as written.
        if(!Number.isFinite(code) || code < 0x20 || code > 0x10FFFF){
            return whole;
        }

        return String.fromCodePoint(code);
    });
}

const extractModels = (content, fileType) => {

    const tagPattern = fileType == 'dmn' ? DECISION_TAG : PROCESS_TAG;
    tagPattern.lastIndex = 0;

    const found = [];
    let match;

    while((match = tagPattern.exec(content)) !== null){

        const attributes = match[1] || '';
        const id = attributeValue(ID_ATTRIBUTE, attributes);

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
