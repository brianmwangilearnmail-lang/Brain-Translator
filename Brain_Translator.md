# Project Specification: Exact-Format Document Translator

## 1. Objective
Build a web application that allows users to upload formatted documents (PDF, DOCX, PPTX, XLSX), translates the text into a target language, and returns a downloadable file with the original layout, formatting, fonts, and images perfectly intact. 

## 2. Tech Stack
* **Frontend:** HTML/Tailwind CSS with vanilla JavaScript.
* **Backend:** Node.js (Express) OR Python (FastAPI) - Agent's choice based on standard Google Cloud SDK compatibility.
* **Cloud Infrastructure:** Google Cloud Platform (GCP).
* **Translation Engine:** Google Cloud Translation API (Advanced) - specifically the `translateDocument` method.
* **Storage:** Google Cloud Storage (GCS) for staging files.

## 3. Infrastructure & Setup Requirements
**Agent Instructions for Setup:**
1.  Assume the user has already created a GCP Project and enabled the Translation API and Cloud Storage API.
2.  Assume the user has a valid `credentials.json` service account file in the root directory. **Critically: Add `credentials.json` to `.gitignore` immediately.**
3.  The application will need two GCS buckets. The backend should programmatically check if buckets named `doc-trans-uploads-[unique-id]` and `doc-trans-outputs-[unique-id]` exist. If not, generate code to create them on startup.

## 4. Backend Implementation Steps
**Agent Instructions for Backend Logic:**
1.  **Upload Endpoint:** Create an endpoint `/api/upload` that accepts a multipart/form-data file upload and a `targetLanguage` string.
2.  **Storage Routing:** Securely upload the received file to the uploads GCS bucket.
3.  **Translation Trigger:** Construct the request for the Translation API (Advanced) `translateDocument` client. 
    * Input: The GCS URI of the uploaded file.
    * Output: The GCS URI destination in the outputs bucket.
    * Target Language Code: The code provided by the frontend.
4.  **Async Polling:** Wait for the translation operation to finish.
5.  **Retrieval:** Once translated, fetch a signed download URL for the resulting document from the outputs GCS bucket.
6.  **Response:** Return the signed download URL to the frontend.

## 5. Frontend Implementation Steps
**Agent Instructions for Frontend Logic:**
1.  Create a clean, modern, single-page UI.
2.  Include a drag-and-drop file upload zone (restricted to .pdf, .docx, .pptx, .xlsx).
3.  Include a dropdown menu for target languages (e.g., Spanish, French, German, Japanese,Swahili).
4.  Include a "Translate Document" submit button.
5.  Display a loading spinner or progress text while the backend processes the file (this API call can take 10-30 seconds depending on file size).
6.  Once the backend returns the signed URL, display a prominent "Download Translated Document" button.

## 6. Antigravity Verification & Artifacts
**Agent Instructions for Quality Assurance:**
1.  Before writing the full backend, generate a small test script `test_translation_api` to ensure the authentication and GCP SDK are configured correctly.
2.  Provide a `README.md` containing the exact CLI commands the user needs to run to start the local development server.
3.  Provide an Artifact summarizing the API endpoints and expected payload structures.