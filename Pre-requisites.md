Here is a complete architectural and code implementation guide for your self-hosted chatbot demo, leveraging Angular, Python (FastAPI), and Vertex AI with Data Store grounding (RAG).

This implementation keeps your Google Cloud credentials strictly on the backend, uses Server-Sent Events (SSE) to stream responses chunk-by-chunk to the frontend, and lays the groundwork for eventual WordPress embedding.

---

### Phase 1: Google Cloud Setup & IAM

Before writing any code, the Google Cloud environment needs to be correctly configured to allow the Python backend to perform RAG using your Vertex AI Data Store.

**1. Create a Service Account:**

* Navigate to **IAM & Admin > Service Accounts** in the Google Cloud Console.
* Create a new Service Account (e.g., `chatbot-backend-sa`).
* Assign the following roles:
  * **Vertex AI User** (`roles/aiplatform.user`): To access the Gemini 1.5 Pro model.
  * **Discovery Engine Viewer** (`roles/discoveryengine.viewer`): To retrieve documents from the Vertex AI Search Data Store.

**2. Generate and Download Keys:**

* Go to the "Keys" tab for your new Service Account.
* Add a new key, choose  **JSON** , and download it.
* Rename it to `service-account.json` and place it in your Python backend directory (make sure this is in your `.gitignore`).
