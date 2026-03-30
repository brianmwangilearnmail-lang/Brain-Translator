const axios = require('axios');
async function testSep() {
    const src = 'en', tgt = 'sw';
    const text = "Hello" + '\n||||\n' + "Goodbye";
    try {
        const res = await axios.get(`https://lingva.ml/api/v1/${src}/${tgt}/${encodeURIComponent(text)}`);
        console.log("Translation structure:", JSON.stringify(res.data.translation));
    } catch (e) { console.error(e.message); }
}
testSep();
