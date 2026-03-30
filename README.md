# Brain Translator

AI-powered document translator that preserves the original layout and formatting of PDF, DOCX, PPTX, and XLSX files.

## Prerequisites

1.  **Google Cloud Project**: You must have a GCP project with the following APIs enabled:
    *   Cloud Translation API (Advanced)
    *   Cloud Storage API
2.  **Service Account**: Create a service account with `Cloud Translation API Editor` and `Storage Admin` roles.
3.  **Credentials**: Download the JSON key file, rename it to `credentials.json`, and place it in the root directory of this project.

## Setup & Running

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Server**:
    ```bash
    node index.js
    ```

3.  **Access the App**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

*   **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
*   **Backend**: Node.js, Express
*   **AI/ML**: Google Cloud Translation API (v3)
*   **Storage**: Google Cloud Storage (GCS)

## Important Notes

*   The application automatically creates two GCS buckets on startup: `doc-trans-uploads-[project-id]` and `doc-trans-outputs-[project-id]`.
*   Translation of large documents can take up to 30 seconds.
*   Downloaded links are signed URLs that expire after 1 hour.
