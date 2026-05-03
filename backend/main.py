import os
import json
import uuid
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google.cloud import dialogflowcx_v3 as dialogflow

# --- Configuration & Security ---
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "your-project-id")
LOCATION = os.getenv("GCP_LOCATION", "us-central1") # Must match your agent's location
AGENT_ID = os.getenv("AGENT_ID", "your-agent-uuid-goes-here") 

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200", 
        "https://your-store-name.myshopify.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    page_context: Optional[str] = None
    session_id: Optional[str] = None # Added for Agent memory

def talk_to_agent(message: str, page_context: Optional[str] = None, session_id: Optional[str] = None):
    # Initialize the Dialogflow CX Client
    # The endpoint must match your agent's location
    client_options = None
    if LOCATION != 'global':
        client_options = {"api_endpoint": f"{LOCATION}-dialogflow.googleapis.com"}
    
    client = dialogflow.SessionsClient(client_options=client_options)

    # Use the provided session ID or create a new one to maintain chat history
    current_session = session_id or str(uuid.uuid4())
    session_path = f"projects/{PROJECT_ID}/locations/{LOCATION}/agents/{AGENT_ID}/sessions/{current_session}"

    # Inject Shopify context if present
    final_message = message
    if page_context:
        final_message = f"[System: User is viewing {page_context}] User says: {message}"

    # Construct the request
    text_input = dialogflow.TextInput(text=final_message)
    query_input = dialogflow.QueryInput(text=text_input, language_code="en")
    request = dialogflow.DetectIntentRequest(
        session=session_path,
        query_input=query_input
    )

    try:
        # Call the Vertex AI Agent
        response = client.detect_intent(request=request)
        
        # Extract the response text
        response_text = ""
        for response_message in response.query_result.response_messages:
            if response_message.text:
                response_text += response_message.text.text[0] + "\n"

        # Yield the response in SSE format to maintain frontend compatibility
        # We also pass back the session_id so the frontend can hold onto it
        payload = {
            "text": response_text.strip(),
            "session_id": current_session
        }
        yield f"data: {json.dumps(payload)}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        talk_to_agent(request.message, request.page_context, request.session_id),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)