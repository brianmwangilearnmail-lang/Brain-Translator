const axios = require('axios');
require('dotenv').config();

async function checkToken() {
    const token = process.env.APY_TOKEN;
    console.log('Testing token validity via workspace check...');
    try {
        // Try to get workspace info - simple GET request that needs auth
        const response = await axios.get('https://api.apyhub.com/workspace', {
            headers: { 'apy-token': token }
        });
        console.log('✅ Success! Workspace:', response.data);
    } catch (err) {
        console.error('❌ Authentication Failed.');
        console.error('Status:', err.response ? err.response.status : 'No Response');
        console.error('Data:', err.response ? err.response.data : err.message);
    }
}
checkToken();
