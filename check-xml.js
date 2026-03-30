const fs = require('fs');
const AdmZip = require('adm-zip');
const axios = require('axios');
const path = require('path');

// Borrow the logic from index.js
function xmlEscape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function extractWtTexts(xml) {
    const wtRegex = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;
    const texts = [];
    let m;
    while ((m = wtRegex.exec(xml)) !== null) {
        const decoded = m[2]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        texts.push({ open: m[1], text: decoded, close: m[3], index: m.index, fullMatch: m[0] });
    }
    return texts;
}

function injectTranslations(xml, wtTexts, translations) {
    let result = xml;
    for (let i = wtTexts.length - 1; i >= 0; i--) {
        const wt = wtTexts[i];
        const raw = (translations[i] && translations[i].trim()) ? translations[i] : wt.text;
        const safe = xmlEscape(raw);
        const replacement = `${wt.open}${safe}${wt.close}`;
        result = result.slice(0, wt.index) + replacement + result.slice(wt.index + wt.fullMatch.length);
    }
    return result;
}

// Find a docx file in the temp folder to test with
const tempDir = path.join(__dirname, 'public', 'temp');
const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.docx'));

if (files.length === 0) {
    console.log("No test files found in temp dir.");
    process.exit(0);
}

// Just take the latest translated file... wait, the user uploaded a file,
// where is the ORIGINAL uploaded file? Multer keeps it in memory.
// I will just use the translated file, which is corrupted, and check its XML.
const corruptedFile = path.join(tempDir, files[0]);
console.log(`Checking ${corruptedFile}`);

try {
    const zip = new AdmZip(corruptedFile);
    const docEntry = zip.getEntry('word/document.xml');
    const xml = docEntry.getData().toString('utf8');

    // Validate with regex or basic sax parser
    // We can use the builtin fast-xml-parser if we install it, or just write it to disk to lint
    fs.writeFileSync('bad_document.xml', xml);
    console.log("Wrote bad_document.xml. You can lint it now.");

    // Also let's check for invalid control chars
    const invalidChars = xml.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
    if (invalidChars) {
        console.log("FOUND INVALID CONTROL CHARACTERS in XML!", new Set(invalidChars));
    } else {
        console.log("No invalid control characters found.");
    }

} catch (e) {
    console.error("Error reading zip:", e.message);
}
