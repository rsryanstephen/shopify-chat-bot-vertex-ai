**GCP Cloud Run Readiness Checklist (Backend):**
To transition your backend from localhost to production on Cloud Run, ensure the following are complete:

* **Dockerfile:** Create a standard Python Dockerfile exposing port `8080`.
  **Dockerfile**

  ```
  FROM python:3.10-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install -r requirements.txt
  COPY . .
  # Cloud Run dynamically sets the PORT environment variable (default 8080)
  CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
  ```
* **Environment Variables:** Configure `GCP_PROJECT_ID`, `GCP_LOCATION`, and `DATASTORE_ID` in the Cloud Run service configuration via the GCP Console or CLI.
* **IAM Identity:** Instead of relying on a `.json` key file, assign a **Service Account** directly to the Cloud Run service. Ensure this Service Account has the `Vertex AI User` and `Discovery Engine Viewer` roles.
* **Update Frontend URL:** Once Cloud Run issues your public `https://...run.app` URL, update the `backendUrl` variable inside your Angular component and rebuild the Web Component.
