const axios = require('axios');

async function testLingva() {
    const instances = [
        'https://lingva.ml',
        'https://translate.plausibility.cloud',
        'https://lingva.thedaviddelta.com'
    ];
    const text = 'Good morning, how are you?';
    for (const instance of instances) {
        try {
            console.log(`Testing ${instance}...`);
            const url = `${instance}/api/v1/en/sw/${encodeURIComponent(text)}`;
            const res = await axios.get(url, { timeout: 10000 });
            if (res.data && res.data.translation) {
                console.log(`✅ ${instance} works! → "${res.data.translation}"`);
                return;
            }
        } catch (err) {
            console.log(`❌ ${instance}: ${err.message}`);
        }
    }
    console.log('⚠️ No Lingva instances reachable. Falling back to MyMemory.');
}
testLingva();
