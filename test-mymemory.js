const axios = require('axios');

async function test() {
    console.log('Testing MyMemory translation API...');
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent('Hello, how are you today?')}&langpair=en|sw`;
        const response = await axios.get(url, { timeout: 10000 });
        const result = response.data;
        if (result.responseStatus === 200) {
            console.log('✅ SUCCESS! Swahili:', result.responseData.translatedText);
        } else {
            console.error('❌ API Error:', result);
        }
    } catch (err) {
        console.error('❌ Network error:', err.message);
    }
}
test();
