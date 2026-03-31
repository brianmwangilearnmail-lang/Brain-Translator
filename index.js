const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const PizZip = require('pizzip');
const { TranslationServiceClient } = require('@google-cloud/translate').v3;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize GCP Client if credentials exist
const credentialsPath = path.join(__dirname, 'credentials.json');
let translationClient = null;
let projectId = null;

if (fs.existsSync(credentialsPath)) {
    try {
        const creds = JSON.parse(fs.readFileSync(credentialsPath));
        projectId = creds.project_id;
        translationClient = new TranslationServiceClient({ keyFilename: credentialsPath });
        console.log(`✅ Loaded Google Cloud Translation for project: ${projectId}`);
    } catch (e) {
        console.warn(`⚠️ Failed to load Google Cloud credentials: ${e.message}`);
    }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
        translationClient = new TranslationServiceClient(); 
        projectId = process.env.GOOGLE_PROJECT_ID || 'auto-detect';
        console.log(`✅ Loaded Google Cloud Translation from environment variable`);
    } catch (e) {
        console.warn(`⚠️ Failed to init GCP client from ENV: ${e.message}`);
    }
}

app.use(cors());
app.use(express.json());

// Prevent browser from caching HTML and JS so users always get fresh code
app.use((req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
    }
    next();
});

app.use(express.static('public'));

// Debug: confirm server version
app.get('/api/version', (req, res) => {
    res.json({ version: '3.0', status: 'Blob download enabled', time: new Date().toISOString() });
});

// We rely on standard express static serving from public folder.
// This completely bypasses all Content-Disposition header issues.

const upload = multer({ storage: multer.memoryStorage() });

// ─── Translation Engine ──────────────────────────────────────────────────────

const LINGVA_INSTANCES = [
    'https://lingva.ml',
    'https://translate.plausibility.cloud',
    'https://lingva.thedaviddelta.com'
];
const BATCH_SEP = '\n||||\n';
const MAX_BATCH_CHARS = 3500;
const MAX_CONCURRENT = 8;

async function callGCP(texts, tgt) {
    if (!translationClient) return null;
    try {
        // Find project ID from client if not set
        if (!projectId || projectId === 'auto-detect') {
            projectId = await translationClient.getProjectId();
        }

        const request = {
            parent: `projects/${projectId}/locations/global`,
            contents: texts,
            mimeType: 'text/plain',
            targetLanguageCode: tgt,
        };
        const [response] = await translationClient.translateText(request);
        return response.translations.map(t => t.translatedText);
    } catch (err) {
        console.warn(`  ⚠️ GCP Translation Failed: ${err.message}`);
    }
    return null;
}

async function callApyHub(text, tgt) {
    if (!process.env.APY_TOKEN) return null;
    try {
        const formData = new FormData();
        formData.append('file', Buffer.from(text), { filename: 'text.txt' });
        formData.append('language', tgt);
        const res = await axios.post('https://api.apyhub.com/translate/file', formData, {
            headers: { ...formData.getHeaders(), 'apy-token': process.env.APY_TOKEN },
            responseType: 'arraybuffer'
        });
        if (res.data) return Buffer.from(res.data).toString();
    } catch (err) {
        console.warn(`  ⚠️ ApyHub Failed: ${err.message}`);
    }
    return null;
}

async function callLingva(text, src, tgt) {
    for (const host of LINGVA_INSTANCES) {
        try {
            const res = await axios.get(`${host}/api/v1/${src}/${tgt}/${encodeURIComponent(text)}`, { timeout: 20000 });
            if (res.data?.translation) return res.data.translation;
        } catch { }
    }
    return null;
}

async function callMyMemory(text, tgt) {
    try {
        const res = await axios.get(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${tgt}`,
            { timeout: 15000 }
        );
        if (res.data?.responseStatus === 200) return res.data.responseData.translatedText;
    } catch { }
    return null;
}

async function callGoogleProxy(text, src, tgt) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${tgt}&dt=t`;
        const res = await axios.post(url, `q=${encodeURIComponent(text)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
        });
        if (res.data && res.data[0]) {
            return res.data[0].map(x => x[0]).join('');
        }
    } catch (err) {
        console.warn(`  ⚠️ Google Proxy Failed: ${err.message}`);
    }
    return null;
}

async function translateBatch(texts, src, tgt) {
    // 1. HIGH-QUALITY: Official GCP API (Array-based, no separators needed)
    let gcpResult = await callGCP(texts, tgt);
    if (gcpResult && gcpResult.length === texts.length) {
        console.log(`  ✨ [BATCH-GCP] Translated ${texts.length} nodes successfully.`);
        return gcpResult;
    }

    const combined = texts.join(BATCH_SEP);
    let result = null;

    // 2. STABLE: Google Proxy with sl=auto
    result = await callGoogleProxy(combined, 'auto', tgt);
    if (result) console.log(`  ✨ [BATCH-PROXY] Translated ${texts.length} nodes.`);
    
    // 3. Fallbacks
    if (!result) {
        result = await callLingva(combined, src, tgt);
        if (result) console.log(`  ✨ [BATCH-LINGVA] Translated ${texts.length} nodes.`);
    }
    if (!result) {
        result = await callMyMemory(combined, tgt);
        if (result) console.log(`  ✨ [BATCH-MYMEMORY] Translated ${texts.length} nodes.`);
    }
    if (!result) {
        result = await callApyHub(combined, tgt);
        if (result) console.log(`  ✨ [BATCH-APYHUB] Translated ${texts.length} nodes.`);
    }
    
    // ApyHub expects the file translation to work differently, 
    // but we can try its simple translate endpoint if it exists
    // (ApyHub file endpoint returns binary, so it doesn't fit here well)

    // If all entirely fail, we return the original english so it doesn't corrupt the file
    if (!result) {
        console.warn(`  ❌ All engines failed for this batch.`);
        return texts;
    }

    const parts = result.split(/\s*\|\|\|\|\s*/).map(s => s.trim());
    if (parts.length !== texts.length) {
        console.warn(`  ⚠️ Batch split mismatch: Expected ${texts.length}, got ${parts.length}. Parts:`, parts);
    }
    return texts.map((orig, i) => parts[i] || orig);
}

async function translateAll(texts, src, tgt) {
    const batches = [];
    let cur = [], curLen = 0;
    for (const t of texts) {
        if (curLen + t.length > MAX_BATCH_CHARS && cur.length > 0) {
            batches.push(cur); cur = []; curLen = 0;
        }
        cur.push(t);
        curLen += t.length + BATCH_SEP.length;
    }
    if (cur.length > 0) batches.push(cur);

    console.log(`  📦 ${texts.length} text nodes → ${batches.length} batches (${MAX_CONCURRENT} parallel)`);

    const results = [];
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
        const chunk = batches.slice(i, i + MAX_CONCURRENT);
        const settled = await Promise.all(chunk.map(b => translateBatch(b, src, tgt)));
        settled.forEach(r => results.push(...r));
        const done = Math.min(i + MAX_CONCURRENT, batches.length);
        console.log(`  ✅ Batches ${i + 1}–${done} of ${batches.length}`);
    }
    return results;
}

// ─── XML-level Text Extraction & Injection ───────────────────────────────────

function xmlEscape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/[\n\r]/g, ' ')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function extractTexts(xml, tagPrefix) {
    const regexStr = tagPrefix
        ? `(<${tagPrefix}:t(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/${tagPrefix}:t>)`
        : `(<t(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/t>)`;
    const regex = new RegExp(regexStr, 'g');
    const texts = [];
    let m;
    while ((m = regex.exec(xml)) !== null) {
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

function injectTranslations(xml, textsInfo, translations) {
    let result = xml;
    for (let i = textsInfo.length - 1; i >= 0; i--) {
        const info = textsInfo[i];
        const raw = (translations[i] && translations[i].trim()) ? translations[i] : info.text;
        const safe = xmlEscape(raw);
        const replacement = `${info.open}${safe}${info.close}`;
        result = result.slice(0, info.index) + replacement + result.slice(info.index + info.fullMatch.length);
    }
    return result;
}

// ─── Save output to a direct downloads folder ────────────────────────────────
// Stores file as: public/downloads/<shortId>_<prettyName>
// The direct URL inherently enforces the exact filename.
function saveToTemp(buffer, prettyFileName) {
    const shortId = Math.random().toString(36).substring(2, 8); // e.g. "a4z9p2"
    // Remove spaces and special chars to prevent Edge/Chrome URL encoding anomalies
    const safePrettyName = prettyFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${shortId}_${safePrettyName}`;
    
    const jobFolder = path.join(__dirname, 'public', 'downloads');
    fs.mkdirSync(jobFolder, { recursive: true });
    
    fs.writeFileSync(path.join(jobFolder, uniqueFileName), buffer);
    
    return {
        downloadUrl: `/downloads/${encodeURIComponent(uniqueFileName)}`,
        fileName: uniqueFileName
    };
}

async function handleApyPDF(buffer, originalname, targetLang) {
    if (!process.env.APY_TOKEN) throw new Error('ApyHub token missing for PDF translation.');
    console.log(`  📑 Using ApyHub for PDF layout-aware text translation...`);
    const formData = new FormData();
    formData.append('file', buffer, { filename: originalname });
    formData.append('language', targetLang);
    const res = await axios.post('https://api.apyhub.com/translate/file', formData, {
        headers: { ...formData.getHeaders(), 'apy-token': process.env.APY_TOKEN }
    });
    if (res.data?.translation) return Buffer.from(res.data.translation);
    throw new Error('ApyHub PDF translation returned no content.');
}

// ─── Upload Endpoint ──────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('document'), async (req, res) => {
    if (!req.file || !req.body.targetLanguage) {
        return res.status(400).json({ error: 'Missing file or target language.' });
    }

    const { buffer, originalname } = req.file;
    const targetLang = req.body.targetLanguage;
    const srcLang = 'auto'; // Enable auto-detection by default
    const ext = path.extname(originalname).toLowerCase();
    const basename = path.basename(originalname, ext);

    console.log(`\n🚀 Translating "${originalname}" (auto-detect) → ${targetLang}`);

    const supported = ['.docx', '.pptx', '.xlsx', '.pdf'];
    if (!supported.includes(ext)) {
        return res.status(400).json({
            error: `Format ${ext} not supported. Use: ${supported.join(', ')}`
        });
    }

    try {
        // ── PDF ──────────────────────────────────────────────────────────────
        if (ext === '.pdf') {
            const translatedText = await handleApyPDF(buffer, originalname, targetLang);
            // PDF engines return text; save as .txt (true PDF-in/PDF-out needs paid PDF engine)
            const prettyName = `Translated-${basename}.txt`;
            const result = saveToTemp(translatedText, prettyName);
            result.note = 'PDF extracted and translated to text.';
            return res.json(result);
        }

        // ── Office ZIP formats: DOCX → DOCX, PPTX → PPTX, XLSX → XLSX ──────
        const zip = new PizZip(buffer);
        const filesToProcess = [];

        if (ext === '.docx') {
            filesToProcess.push({ path: 'word/document.xml', tagPrefix: 'w' });
        } else if (ext === '.pptx') {
            Object.keys(zip.files).forEach(f => {
                if (f.startsWith('ppt/slides/slide') && f.endsWith('.xml')) {
                    filesToProcess.push({ path: f, tagPrefix: 'a' });
                }
            });
        } else if (ext === '.xlsx') {
            if (zip.files['xl/sharedStrings.xml']) {
                filesToProcess.push({ path: 'xl/sharedStrings.xml', tagPrefix: '' });
            }
            Object.keys(zip.files).forEach(f => {
                if (f.startsWith('xl/worksheets/sheet') && f.endsWith('.xml')) {
                    filesToProcess.push({ path: f, tagPrefix: '' });
                }
            });
        }

        if (filesToProcess.length === 0) {
            throw new Error('No translatable content found in the package.');
        }

        console.log(`📄 Found ${filesToProcess.length} file(s) to process`);

        // 1. Extract text nodes
        const allTextData = [];
        for (const fileInfo of filesToProcess) {
            const xml = zip.file(fileInfo.path).asText();
            const texts = extractTexts(xml, fileInfo.tagPrefix);
            allTextData.push({ ...fileInfo, xml, texts });
        }

        const flatTexts = allTextData.flatMap(d => d.texts.map(t => t.text));
        const toTranslate = flatTexts.map(t => t.trim().length > 1 && !/^\d+$/.test(t.trim()) ? t : null);
        const uniqueNonEmpty = [...new Set(toTranslate.filter(Boolean))];

        console.log(`📊 ${flatTexts.length} text nodes, ${uniqueNonEmpty.length} unique non-empty to translate`);

        // 2. Translate
        const translationMap = new Map();
        if (uniqueNonEmpty.length > 0) {
            const translated = await translateAll(uniqueNonEmpty, srcLang, targetLang);
            uniqueNonEmpty.forEach((orig, i) => translationMap.set(orig, translated[i]));
        }

        // 3. Inject translations back
        for (const data of allTextData) {
            const translations = data.texts.map(t => {
                const trimmed = t.text.trim();
                if (trimmed.length <= 1 || /^\d+$/.test(trimmed)) return t.text;
                return translationMap.get(t.text) ?? t.text;
            });
            const translatedXml = injectTranslations(data.xml, data.texts, translations);
            zip.file(data.path, translatedXml);
        }

        // 4. Repack — EXACT SAME format as input (docx→docx, xlsx→xlsx, pptx→pptx)
        const outputBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        // Name = "Translated-<originalBasename>.<originalExtension>"
        const prettyName = `Translated-${basename}${ext}`;
        const result = saveToTemp(outputBuffer, prettyName);

        console.log(`✅ Done! Output: ${prettyName}\n`);
        res.json(result);

    } catch (err) {
        console.error('❌ Error:', err.message);
        res.status(500).json({ error: 'Translation failed', details: err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Brain Translator running at http://localhost:${port}`);
    console.log(`🌐 Engines: Google Proxy (High Quality) -> Lingva -> MyMemory -> ApyHub`);
});
