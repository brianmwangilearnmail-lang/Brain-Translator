const axios = require('axios');
require('dotenv').config();

async function test() {
    const token = process.env.APY_TOKEN;
    console.log('Testing token:', token.substring(0, 5) + '...');
    try {
        const response = await axios.post('https://api.apyhub.com/translate/text', {
            source_language: 'en',
            target_language: 'sw',
            text: 'Hello world'
        }, {
            headers: { 'apy-token': token }
        });
        console.log('✅ Token works! Translation:', response.data.data);
    } catch (err) {
        console.error('❌ Token Error:', err.response ? err.response.data : err.message);
    }
}
test();
