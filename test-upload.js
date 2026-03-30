/**
 * End-to-end test: uploads an XLSX from the temp folder and checks:
 * 1. Response has downloadUrl matching /api/download/<jobId>/<filename>
 * 2. fileName has correct .xlsx extension
 * 3. The file is actually accessible at that URL
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

// Find an existing XLSX in temp to reuse
const tempDir = path.join(__dirname, 'public', 'temp');
let testFile = null;

// Walk temp dir for any xlsx
function findXlsx(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = findXlsx(full);
            if (found) return found;
        } else if (entry.name.endsWith('.xlsx')) {
            return full;
        }
    }
    return null;
}

testFile = findXlsx(tempDir);

if (!testFile) {
    console.error('❌ No XLSX found in temp. Please translate a file first.');
    process.exit(1);
}

console.log(`✅ Found test XLSX: ${testFile}`);

// Upload it via multipart POST
const FormData = require('form-data');
const axios = require('axios');

(async () => {
    const form = new FormData();
    form.append('document', fs.createReadStream(testFile), {
        filename: 'test-document.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    form.append('targetLanguage', 'fr');

    console.log('\n📤 Uploading test-document.xlsx to /api/upload...');

    try {
        const res = await axios.post('http://localhost:3000/api/upload', form, {
            headers: form.getHeaders(),
            timeout: 120000
        });

        const { downloadUrl, fileName } = res.data;
        console.log('\n📥 API Response:');
        console.log('  downloadUrl:', downloadUrl);
        console.log('  fileName:   ', fileName);

        // Validate format
        const urlOk = /\/api\/download\/[a-f0-9-]+\/.+\.xlsx$/i.test(downloadUrl);
        const nameOk = fileName && fileName.endsWith('.xlsx');

        console.log('\n🔍 Validation:');
        console.log('  downloadUrl has correct UUID/filename format:', urlOk ? '✅ YES' : '❌ NO');
        console.log('  fileName preserves .xlsx extension:          ', nameOk ? '✅ YES' : '❌ NO');

        // Test the download endpoint
        console.log('\n📡 Testing download endpoint...');
        const dlRes = await axios.get(`http://localhost:3000${downloadUrl}`, {
            responseType: 'arraybuffer',
            timeout: 10000
        });

        const cd = dlRes.headers['content-disposition'];
        console.log('  Content-Disposition header:', cd);
        console.log('  Content-Type header:       ', dlRes.headers['content-type']);
        console.log('  File size received:        ', dlRes.data.length, 'bytes');

        const cdOk = cd && cd.includes('.xlsx');
        console.log('\n🎯 Content-Disposition includes .xlsx: ', cdOk ? '✅ YES' : '❌ NO');

        if (urlOk && nameOk && cdOk) {
            console.log('\n🎉 ALL CHECKS PASSED — files will download with correct format!\n');
        } else {
            console.log('\n⚠️  Some checks failed — review above.\n');
        }

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        if (err.response) {
            console.error('   Response:', err.response.data);
        }
    }
})();
