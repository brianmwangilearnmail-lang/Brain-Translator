const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const APY_TOKEN = process.env.APY_TOKEN;

async function testApyTranslate() {
    console.log('🚀 Testing ApyHub Translation API...');
    
    // Create a dummy HTML file to test
    const testFilePath = path.join(__dirname, 'test-dummy.html');
    fs.writeFileSync(testFilePath, '<html><body><h1>Hello, world!</h1><p>This is a test.</p></body></html>');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('language', 'es'); // Spanish

    try {
        const response = await axios.post('https://api.apyhub.com/translate/file', formData, {
            headers: {
                ...formData.getHeaders(),
                'apy-token': APY_TOKEN
            },
            responseType: 'arraybuffer'
        });

        console.log('✅ Translation Success!');
        fs.writeFileSync('translated-test.txt', response.data);
        console.log('📄 Saved translated file to translated-test.txt');
        
    } catch (err) {
        console.error('❌ Translation Failed.');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', Buffer.from(err.response.data).toString());
        } else {
            console.error('Error:', err.message);
        }
    } finally {
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
}

testApyTranslate();
