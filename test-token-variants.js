const axios = require('axios');
require('dotenv').config();

async function testToken(token, headerName) {
    console.log(`Testing with header: ${headerName}...`);
    try {
        const headers = {};
        if (headerName === 'Authorization') {
            headers[headerName] = `Bearer ${token}`;
        } else {
            headers[headerName] = token;
        }

        const response = await axios.post('https://api.apyhub.com/translate/text', {
            source_language: 'en',
            target_language: 'sw',
            text: 'Hello world'
        }, {
            headers: headers
        });
        console.log(`✅ ${headerName} works! Translation:`, response.data.data);
        return true;
    } catch (err) {
        console.error(`❌ ${headerName} Error:`, err.response ? err.response.data : err.message);
        return false;
    }
}

async function run() {
    const token = process.env.APY_TOKEN;
    const ok1 = await testToken(token, 'apy-token');
    if (!ok1) {
        await testToken(token, 'Authorization');
    }
}
run();
