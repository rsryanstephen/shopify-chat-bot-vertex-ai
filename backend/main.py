import os
import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, grounding
from typing import Optional

# --- Configuration & Security ---
# Credentials must be set via GOOGLE_APPLICATION_CREDENTIALS in the environment.
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "danntech-poc")
LOCATION = os.getenv("GCP_LOCATION", "global")
DATASTORE_ID = os.getenv("DATASTORE_ID", "poc1")

vertexai.init(project=PROJECT_ID, location=LOCATION)

app = FastAPI()

# Configure CORS: Allow localhost:4200 and a wildcard for future deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    page_context: Optional[str] = None # Make it optional in case they aren't on a product page

def generate_stream(prompt: str, page_context: Optional[str] = None):
    datastore_path = f"projects/{PROJECT_ID}/locations/global/collections/default_collection/dataStores/{DATASTORE_ID}"
    
    # RAG Grounding Tool setup
    model = GenerativeModel("gemini-1.5-pro")
    
    # Inject the Shopify context behind the scenes
    system_context = ""
    if page_context:
        system_context = f"[System Note: The user is currently viewing this specific page/product context: {page_context}. Tailor your response appropriately if they ask a context-dependent question.]\n\n"
    
    final_prompt = f"{system_context}User Message: {prompt}"

    # Try to construct a retrieval tool; if grounding API has changed, fall back
    # to generation without retrieval so the endpoint remains functional.
    try:
        if hasattr(grounding, "Retrieval") and hasattr(grounding, "VertexAISearch"):
            tool = Tool.from_retrieval(
                grounding.Retrieval(grounding.VertexAISearch(datastore=datastore_path))
            )
            responses = model.generate_content(final_prompt, tools=[tool], stream=True)
        else:
            raise AttributeError("grounding.Retrieval or grounding.VertexAISearch not available")
    except Exception as e:
        yield f"data: {json.dumps({'warning': 'RAG grounding unavailable, proceeding without retrieval', 'details': str(e)})}\n\n"
        responses = model.generate_content(final_prompt, stream=True)

    try:
        for chunk in responses:
            if chunk.text:
                yield f"data: {json.dumps({'text': chunk.text})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        generate_stream(request.message, request.page_context), 
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)