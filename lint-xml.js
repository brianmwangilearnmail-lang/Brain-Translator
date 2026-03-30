const { XMLValidator } = require('fast-xml-parser');
const fs = require('fs');

const xmlData = fs.readFileSync('bad_document.xml', 'utf8');
const result = XMLValidator.validate(xmlData);

if (result === true) {
    console.log("XML is valid according to fast-xml-parser!");
} else {
    console.error("XML Error Details:", result.err);

    // Print the context
    const lines = xmlData.split('\n');
    const line = result.err.line;
    const col = result.err.col;

    console.log(`\nContext around Line ${line}:`);
    for (let i = Math.max(0, line - 2); i < Math.min(lines.length, line + 2); i++) {
        console.log(`${i}: ${lines[i]}`);
        if (i === line - 1) { // 1-indexed line
            console.log(' '.repeat(Math.max(0, col - 1)) + '^--- error here');
        }
    }
}
