import os
import json
import uuid
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types

# --- Configuration ---
PROJECT_ID = "danntech-poc"
LOCATION = "europe-central2" 
RAG_CORPUS = "projects/danntech-poc/locations/europe-central2/ragCorpora/4611686018427387904"
MODEL_NAME = "gemini-3.1-pro-preview"

# Initialize the GenAI Client (Make sure GOOGLE_APPLICATION_CREDENTIALS is set)
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

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

# In-memory dictionary to hold chat sessions for the demo
active_sessions = {}

# Exact System Instructions from your Google export
SYSTEM_INSTRUCTIONS = """
### 1. Role Definition
You are an expert Electronic Applications Engineer for Danntech, acting as a technical customer service assistant. Your tone is professional, direct, and strictly technical.

### 2. Core Principles
- **Grounding:** You are 100% grounded in the provided context. Every factual claim must be supported by the provided documents.
- **Information Not Found:** If the answer is not in the provided context, you MUST state: "Information not found in the provided documentation." Do not apologize or speculate.
- **Precision:** Use precise industry terminology from the documentation. Avoid vague descriptors; use numerical specifications. Preserve exact units and part numbers as they appear in the source.
- **Synthesis:** Synthesize information from the context to directly answer the question. Do not provide a general summary of the documents.

### 3. Instructions
#### Conversational Flow
1.  **Initial Greeting:** On first contact, greet the user with: "Hello, this is the Danntech technical service. To best assist you, please state your technical background: Matric or Engineering Degree."
2.  **Acknowledge Background:**
    -   If the user states "Matric" or "grade 12", reply with: "Thank you. Responses will be simplified." Then wait for their question.
    -   If the user states "Engineering Degree" or similar, reply with: "Thank you. Responses will be provided with full technical detail." Then wait for their question.
3.  **Answering:** Address the user's technical query according to the Core Principles and Constraints.

#### Formatting
- **Comparisons:** When asked to compare products, generate a Markdown table with columns for: Model Number, Primary Specification, Key Features, and Application Suitability.
- **Citations:** Follow every factual claim with a citation to the specific document or source it was retrieved from.

### 4. Constraints
- **Scope:** Only answer questions related to the electronic components in the provided documentation. For questions about pricing, availability, or lead times, respond with: "For pricing and availability, please contact our sales department."
- **Clarity:** If a question is ambiguous (e.g., asks for the "best" component), ask for clarification on the key performance metrics.
- **Persona:** Do not apologize, express opinions, use conversational filler, or break character. Remain concise and direct.
- **Prohibited Content:** Do not generate creative content, provide advice outside the technical scope (e.g., safety, legal), or engage in off-topic conversation.
- **Formatting:** Use only plain text, Markdown tables for comparisons, and bolding for part numbers or specifications. Do not use other formatting like headers, lists (unless listing specs from the context), or emojis.
"""

def get_or_create_chat(session_id: str):
    """Retrieves an existing chat session or creates a new one configured with tools."""
    if session_id in active_sessions:
        return active_sessions[session_id]

    # Configure the RAG Tool
    tools = [
        types.Tool(
            retrieval=types.Retrieval(
                vertex_rag_store=types.VertexRagStore(
                    rag_resources=[types.VertexRagStoreRagResource(rag_corpus=RAG_CORPUS)],
                    similarity_top_k=10,
                )
            )
        )
    ]
    
    # Apply Google's exact exported configuration including Safety & Thinking
    config = types.GenerateContentConfig(
        temperature=0.1,
        top_p=0.1,
        max_output_tokens=65535,
        thinking_config=types.ThinkingConfig(
            thinking_level="LOW",
        ),
        safety_settings=[
            types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_LOW_AND_ABOVE"),
            types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_LOW_AND_ABOVE"),
            types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_LOW_AND_ABOVE"),
            types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_LOW_AND_ABOVE")
        ],
        system_instruction=[types.Part.from_text(text=SYSTEM_INSTRUCTIONS)],
        tools=tools
    )
    
    # Initialize a new stateful chat object, injecting the few-shot history
    chat = client.chats.create(
        model=MODEL_NAME, 
        config=config,
        history=FEW_SHOT_HISTORY # This forces the model to read the examples before answering
    )
    active_sessions[session_id] = chat
    return chat

def generate_stream(message: str, page_context: Optional[str] = None, session_id: Optional[str] = None):
    # Assign a new ID if one isn't provided by the frontend
    current_session_id = session_id or str(uuid.uuid4())
    chat = get_or_create_chat(current_session_id)

    # Inject Shopify context silently
    final_prompt = message
    if page_context:
        final_prompt = f"[System Context: User is viewing {page_context}] User message: {message}"

    try:
        # Send message to the stateful chat object and stream the response
        response_stream = chat.send_message_stream(final_prompt)
        
        for chunk in response_stream:
            if chunk.text:
                payload = {
                    "text": chunk.text,
                    "session_id": current_session_id
                }
                yield f"data: {json.dumps(payload)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        generate_stream(request.message, request.page_context, request.session_id),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)