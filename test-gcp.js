const { TranslationServiceClient } = require('@google-cloud/translate').v3;
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const credentialsPath = path.join(__dirname, 'credentials.json');

async function testGCP() {
    if (!fs.existsSync(credentialsPath)) {
        console.error('❌ ERROR: credentials.json not found in root directory.');
        process.exit(1);
    }

    const creds = JSON.parse(fs.readFileSync(credentialsPath));
    const projectId = creds.project_id;
    console.log(`🔍 Testing GCP for Project: ${projectId}...`);

    try {
        // Test Storage
        console.log('--- Testing Storage API ---');
        const storage = new Storage({ keyFilename: credentialsPath });
        const [buckets] = await storage.getBuckets();
        console.log(`✅ Storage success: Found ${buckets.length} buckets.`);

        // Test Translation
        console.log('--- Testing Translation API ---');
        const translationClient = new TranslationServiceClient({ keyFilename: credentialsPath });
        const request = {
            parent: `projects/${projectId}/locations/global`,
            contents: ['Hello World'],
            mimeType: 'text/plain',
            targetLanguageCode: 'es',
        };

        const [response] = await translationClient.translateText(request);
        console.log(`✅ Translation success: "Hello World" -> "${response.translations[0].translatedText}"`);

        console.log('\n🌟 GCP Configuration looks GOOD! You are ready to run the app.');

    } catch (err) {
        console.error('\n❌ ERROR: GCP test failed.');
        console.error(err.message);
        if (err.message.includes('Permission denied') || err.message.includes('not enabled')) {
            console.log('\n💡 Tip: Make sure the Translation and Storage APIs are enabled in your GCP Console.');
        }
    }
}

testGCP();
