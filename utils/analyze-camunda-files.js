const fs = require('fs');

// Files read at once. Measured on 6,000 files: 8 and 16 cost the same, 4 is
// about 20% slower, and 1 is slower than readFileSync.
const READ_CONCURRENCY = 8;

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


const analyzeCamundafiles = async (filePaths) => {

    //you need to filter
    //then know the type

    const filteredPaths = filePaths.filter(path => path.endsWith('.dmn') || path.endsWith('.bpmn'))

    // Indexed by position so the pool cannot reorder the result.
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

            // null means unreadable, and stays null so it is counted below.
            if(content == null){
                continue;
            }

            const fileType = filePath.endsWith('.dmn')? 'dmn': 'bpmn';

            // extractModels must stay synchronous: the tag regexes are shared
            // and keep lastIndex state, so yielding inside it would let two
            // workers corrupt each other.
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


// One unreadable file must not abort indexing the whole folder.
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
