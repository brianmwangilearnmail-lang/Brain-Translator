const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const languageSelect = document.getElementById('language-select');
const translateBtn = document.getElementById('translate-btn');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');
const downloadLink = document.getElementById('download-link');
const resetBtn = document.getElementById('reset-btn');

let selectedFile = null;
let pendingDownload = null; // { url, fileName }

// ─── Drag and Drop ────────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drop-zone-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drop-zone-active');
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
});

// ─── File Selection ───────────────────────────────────────────────────────────
function handleFileSelect(file) {
    const validExtensions = ['.pdf', '.docx', '.pptx', '.xlsx'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(extension)) {
        alert('Invalid file type. Please upload PDF, DOCX, PPTX, or XLSX.');
        return;
    }

    selectedFile = file;
    dropZone.querySelector('p.drop-text').textContent = `Selected: ${file.name}`;
}

// ─── Translate ────────────────────────────────────────────────────────────────
translateBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('Please select a file first.');
        return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('targetLanguage', languageSelect.value);

    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    try {
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await response.json();

        if (response.ok) {
            loadingSection.classList.add('hidden');
            resultSection.classList.remove('hidden');

            // The server now directly provides a static URL format like:
            // /downloads/a4z9p2_Translated-MyReport.xlsx
            pendingDownload = {
                url: data.downloadUrl,
                fileName: data.fileName || ('Translated-' + selectedFile.name)
            };

            // CRITICAL FIX: Actually set the href on the DOM element!
            // When the user clicks, the browser navigates directly to the file.
            downloadLink.href = pendingDownload.url;
            downloadLink.setAttribute('download', pendingDownload.fileName);
            downloadLink.target = '_blank';

        } else {
            throw new Error(data.error || 'Translation failed');
        }
    } catch (err) {
        alert(`Error: ${err.message}`);
        loadingSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }
});

// ─── Download (Standard HTML5 method — 100% reliable filename) ─────────────
downloadLink.addEventListener('click', (e) => {
    // We let the browser handle this natively.
    // The link already points directly to the static file.
    // e.g. /downloads/a4z9p2_Translated-Budget.xlsx
    if (!pendingDownload) {
        e.preventDefault();
        return;
    }
});

// ─── Reset ────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
    selectedFile = null;
    pendingDownload = null;
    resultSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    dropZone.querySelector('p.drop-text').textContent = 'Drop document here';
    fileInput.value = '';
});
