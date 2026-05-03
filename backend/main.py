import os
import json
import uuid
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google.cloud import discoveryengine_v1beta as discoveryengine

# --- Configuration ---
# Project ID from your IAM screenshot: danntech-poc
PROJECT_ID = "danntech-poc" 
LOCATION = "global" # Agent Builder agents are typically 'global'
AGENT_ID = "agent_1775489512107" 
DATA_STORE_ID = "poc1" # Needed for the engine path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    page_context: Optional[str] = None
    session_id: Optional[str] = None

def talk_to_agent(message: str, page_context: Optional[str] = None, session_id: Optional[str] = None):
    client = discoveryengine.ConversationalSearchServiceClient()

    # Define the "Serving Config" which represents your Agent
    # For Agent Builder, the default config is 'default_config'
    serving_config = client.serving_config_path(
        project=PROJECT_ID,
        location=LOCATION,
        data_store=DATA_STORE_ID,
        serving_config="default_config",
    )

    # Maintain or create a conversation session
    # Session ID must be in the format: projects/.../locations/.../dataStores/.../conversations/...
    if not session_id:
        # Create a new conversation object if no session exists
        conversation = client.create_conversation(
            parent=client.data_store_path(PROJECT_ID, LOCATION, DATA_STORE_ID),
            conversation=discoveryengine.Conversation(),
        )
        session_id = conversation.name
    
    # Construct the query with Shopify context
    user_query = discoveryengine.TextInput(input=message)
    if page_context:
        user_query.input = f"[Context: User is on {page_context}] {message}"

    request = discoveryengine.ConverseConversationRequest(
        name=session_id,
        query=discoveryengine.Query(text_input=user_query),
        serving_config=serving_config,
        summary_spec=discoveryengine.SearchRequest.ContentSearchSpec.SummarySpec(
            summary_result_count=5,
            include_citations=True,
        ),
    )

    try:
        # The DiscoveryEngine Agent currently returns the response in a single block
        # We wrap it in SSE format to keep your Angular frontend working perfectly
        response = client.converse_conversation(request)
        
        reply_text = response.reply.summary.summary_text
        payload = {
            "text": reply_text,
            "session_id": session_id
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