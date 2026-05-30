## My Prompt

my url looks like this `https://console.cloud.google.com/agent-platform/studio/agent-designer/edit/agent_1777818986848?hl=en&project=danntech-poc&session=&userId=user`

---

## Remote Agent Response

Ah, you are using the newer Agent Platform Studio interface! The URL structure is a bit different there.

In the link you shared, your Agent ID is the string immediately following the /edit/ path and right before the question mark (?) that starts the query parameters.

Your Agent ID is: agent_1777818986848

You can drop that exact string straight into your SDK initialization code for the danntech-poc project.

---

## My Prompt to Remote Agent

Regarding your first caveat for path B:

"You Need Your Agent ID: You must find your specific AGENT_ID. Go to your Vertex AI Agent Builder console, click on "Test Agent 1", and look at the URL or the Agent Settings. It will be a long UUID string (e.g., a1b2c3d4-e5f6-7890-1234-567890abcdef)."

We couldn't find the agent ID GUID as you describe above, so we referred to another Gemini agent that gave us the attached response.

---

## Remote Agent Response

Based on your screenshots and the identified ID from the URL, you are indeed using the **Vertex AI Agent Builder (formerly Search & Conversation)** platform. The ID `agent_1777818986848` is the correct identifier for your specific agent configuration in the `danntech-poc` project.

To implement "Path B," we will use the `google-cloud-discoveryengine` library. This is the specific SDK for interacting with agents created in the Agent Platform Studio.

#### Step 1: Update Python Dependencies

You need to install the Discovery Engine client. Run this in your terminal:

**Bash**

```
pip uninstall google-cloud-dialogflow-cx
pip install google-cloud-discoveryengine fastapi uvicorn pydantic
```

---

#### Step 2: Path B Backend Implementation (`main.py`)

This script uses the `ConversationalSearchServiceClient` to talk to "Test Agent 1". It handles the session management so your agent can remember the conversation history.

**Python**

```
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
# Identified from your URL: agent_1777818986848
AGENT_ID = "agent_1777818986848" 
DATA_STORE_ID = "your-datastore-id" # Needed for the engine path

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

def talk_to_agent(message: str, page_context: str = None, session_id: str = None):
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
```

---

### Step 3: Deployment Readiness Checklist

Before running this, ensure your Google Cloud environment is fully synchronized:

* **Data Store ID:** Ensure you have the `DATA_STORE_ID` that "Test Agent 1" is using. You can find this in the **Data Stores** tab of the Agent Builder console.
* **Permissions:** Your Service Account (`728962264546-compute@developer.gserviceaccount.com`) must have the **Discovery Engine Editor** or **Discovery Engine Viewer** role to call the `converse_conversation` method.
* **Session Persistence:** Since the `session_id` in this SDK is a full resource path (e.g., `projects/danntech-poc/locations/global/dataStores/.../conversations/123`), ensure your Angular frontend saves the entire string returned in the first response to pass it back for the next message.

Now that we have successfully mapped the ID and updated the backend for the Agent Platform, should we refine the "System Instructions" inside "Test Agent 1" to better handle the Shopify data, or is the current agent behavior already meeting your needs?

---

## My Response

What changes will be needed to our chat.component.ts (frontend\src\app\chat.component.ts) regarding what you said about session persistence?

"**Session Persistence:** Since the `session_id` in this SDK is a full resource path (e.g., `projects/danntech-poc/locations/global/dataStores/.../conversations/123`), ensure your Angular frontend saves the entire string returned in the first response to pass it back for the next message."

---

## Remote Agent Response

Your current `chat.component.ts` is already about  **90% of the way there** . It contains the logic to capture a `session_id` and send it back in subsequent requests.

However, since you are deploying this on  **Shopify** , where users frequently move between product pages (causing a full page refresh), relying on a simple class variable for `sessionId` will cause the chatbot to "forget" the conversation every time a new page loads.

To handle the **full resource path** requirement for Path B and ensure conversation continuity on Shopify, you should make the following three refinements to your `chat.component.ts`.

#### 1. Robust Session ID Capture

In the `Discovery Engine` SDK, the `session_id` is a long string (e.g., `projects/danntech-poc/locations/global/dataStores/.../conversations/123`). Your current logic captures it, but we should ensure it is stored **outside** of just the component’s memory so it survives page navigation.

**Update your property and constructor:**

**TypeScript**

```
// Replace: sessionId: string | null = null;
// With a getter/setter that uses sessionStorage
get sessionId(): string | null {
  return sessionStorage.getItem('chatbot_session_id');
}
set sessionId(value: string | null) {
  if (value) sessionStorage.setItem('chatbot_session_id', value);
}
```

#### 2. Handle the Streaming Logic

Because the `session_id` is sent via the SSE stream from your FastAPI backend, your current parsing loop is correct. Just ensure the logic doesn't overwrite a valid ID with an empty one.

**In your `sendMessage()` loop:**

**TypeScript**

```
for (const line of lines) {
  if (line.startsWith('data: ')) {
    const data = JSON.parse(line.replace('data: ', ''));
  
    // Check if we received the full resource path session ID
    if (data.session_id && !this.sessionId) {
      this.sessionId = data.session_id; 
    }
  
    if (data.text) {
      this.messages[aiMsgIndex].content += data.text;
    }
  }
}
```

#### 3. Clear Session Logic (Optional but Recommended)

On Shopify, if a user finishes a purchase or wants to start over, they need a way to clear that long resource path. You can add a simple "Reset Chat" method to your component.

**TypeScript**

```
resetChat() {
  sessionStorage.removeItem('chatbot_session_id');
  this.messages = [];
  // This forces the backend to create a brand new conversation resource next time
}
```

#### Why this matters for Shopify

When the user clicks a product on your Shopify store, the browser typically does a hard refresh to the new URL.

* **Current State:** The Angular component re-initializes, `this.sessionId` becomes `null`, and the backend creates a **new** conversation resource in Vertex AI.
* **With `sessionStorage`:** The Angular component re-initializes, retrieves the long `projects/.../conversations/...` string from the browser, and sends it to the backend. The backend then resumes the **existing** conversation resource, maintaining the user's history and context.

---

## My response to new local agent

Please see the attached conversation with the other agent. Regarding the front end (frontend/src/app/chat.component.ts), can you check whether I've implemented the recommended front-end changes correctly or whether the other agent may have missed something?

---

## New Local Agent's Response

All three recommended changes from the agent conversation are correctly implemented in your `chat.component.ts`:

1. **sessionStorage getter/setter** — correctly replaces a simple class property.
2. **Streaming session_id capture** — `data.session_id && !this.sessionId` guard is in place.
3. **`resetChat()` method** — correctly removes the sessionStorage key and clears messages.

**Things the other agent missed:**

* **No UI to trigger `resetChat()`** — The method exists but there's no button in the template to call it. Users have no way to start a new conversation. You likely want to add one, e.g. in the `.chat-input` div or as a header button.
* **Message history is lost on page navigation** — The `sessionId` survives page refreshes via `sessionStorage`, but `messages` is a plain array that resets when the component re-initializes. On Shopify, when a user navigates between pages, they'll get a blank chat window even though the backend conversation continues. If you want visible history continuity, you'd need to persist `messages` in `sessionStorage` too (or fetch history from the backend).
* **`backendUrl` is hardcoded to `localhost:8000`** — This will need to point to your Cloud Run URL in production. Consider making it configurable or environment-driven.

---

Please implement what the other agent missed.

---

All changes applied. Here's what was added:

1. **"New Chat" button** — a `reset-btn` in a `.chat-header` div, wired to [resetChat()](vscode-file://vscode-app/c:/Users/ryan.stephen/AppData/Local/Programs/Microsoft%20VS%20Code/034f571df5/resources/app/out/vs/code/electron-browser/workbench/workbench.html) and disabled while loading.
2. **Message persistence** — [ngOnInit()](vscode-file://vscode-app/c:/Users/ryan.stephen/AppData/Local/Programs/Microsoft%20VS%20Code/034f571df5/resources/app/out/vs/code/electron-browser/workbench/workbench.html) loads messages from [sessionStorage](vscode-file://vscode-app/c:/Users/ryan.stephen/AppData/Local/Programs/Microsoft%20VS%20Code/034f571df5/resources/app/out/vs/code/electron-browser/workbench/workbench.html), and [saveMessages()](vscode-file://vscode-app/c:/Users/ryan.stephen/AppData/Local/Programs/Microsoft%20VS%20Code/034f571df5/resources/app/out/vs/code/electron-browser/workbench/workbench.html) writes them back after the user sends a message and after the AI response completes. [resetChat()](vscode-file://vscode-app/c:/Users/ryan.stephen/AppData/Local/Programs/Microsoft%20VS%20Code/034f571df5/resources/app/out/vs/code/electron-browser/workbench/workbench.html) now also clears `chatbot_messages` from storage.
3. **Configurable [backendUrl](vscode-file://vscode-app/c:/Users/ryan.stephen/AppData/Local/Programs/Microsoft%20VS%20Code/034f571df5/resources/app/out/vs/code/electron-browser/workbench/workbench.html)** — changed from a plain property to [@Input() backendUrl](vscode-file://vscode-app/c:/Users/ryan.stephen/AppData/Local/Programs/Microsoft%20VS%20Code/034f571df5/resources/app/out/vs/code/electron-browser/workbench/workbench.html), defaulting to `http://localhost:8000/api/chat`. When embedding on Shopify, you can pass your Cloud Run URL: `<app-chatbot-ui backendUrl="https://your-cloud-run-url/api/chat">`.

---

## My new prompt to the remote agent

In `backend\google_example_chatbot_to_vertex_ai.py` I have copied over the code from Google's own agent platform studio interface (`https://console.cloud.google.com/agent-platform/studio/saved-prompts/locations/europe-central2/7778270710329245696?hl=en&project=danntech-poc&model=gemini-3.1-pro-preview&region=global`) Which acts as a chat bot that interfaces with the Vertex AI agent `Test Agent 1`. This is here as an example to show you how Google interacts with its own Vertex AI agent in this context.

Please check if we have perhaps missed anything or if there's something that Google's chatbot does that we might need to implement on our side in main.py.

---

## The remote agent's response

This is an incredible catch on your part, and pulling that Google example code is exactly what we needed to see.

By comparing your provided `main.py` with Google's `google_example_chatbot_to_vertex_ai.py`, we have uncovered a massive architectural discrepancy. **We were building for the wrong Google Cloud product.**

Previously, based on the UI terminology, we assumed you were using the orchestrated **Vertex AI Agent Builder** (which requires the `discoveryengine` library). However, your exported code and screenshot reveal you are actually using the new **Vertex AI GenAI Studio** with a **Vertex RAG API** attached.

Here is a breakdown of what Google's example is doing that our `main.py` missed, and the exact code needed to fix it.

### Key Differences & What We Missed

1. **The SDK Library:** Google's code uses the brand new `google-genai` SDK (`from google import genai`), not the `discoveryengine` SDK.
2. **The Connection Target:** You are not connecting to a managed "Agent ID" anymore. You are connecting directly to the `gemini-3.1-pro-preview` model and attaching a specific Data Store via its RAG Corpus ID (`ragCorpora/4611686018427387904`).
3. **Location:** Your RAG Corpus and prompt configuration are located in `europe-central2`, not `global`.
4. **System Instructions:** Google's agent relies heavily on a massive block of "System Instructions" (`si_text1`) to govern its behavior, formatting, and constraints. Our `main.py` completely lacked this context.
5. **Memory/State Management:** This is the biggest hurdle. The `discoveryengine` managed memory for us via a `session_id`. However, the GenAI model is stateless; Google's code manually passes the *entire* chat history back and forth in the `contents` array every time.

### The Corrected Backend (`main.py`)

To implement this perfectly without changing a single line of your Angular frontend (`chat.component.ts`), we will use the `google-genai` library and leverage its `client.chats` feature to manage the conversation history in memory.

**1. Update your dependencies:**

**Bash**

```
pip uninstall google-cloud-discoveryengine
pip install google-genai fastapi uvicorn pydantic
```

**2. Replace `main.py` with this exact implementation:**

**Python**

```
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
  
    # Apply Google's exported configuration
    config = types.GenerateContentConfig(
        temperature=0.1,
        top_p=0.1,
        system_instruction=[types.Part.from_text(text=SYSTEM_INSTRUCTIONS)],
        tools=tools
    )
  
    # Initialize a new stateful chat object
    chat = client.chats.create(model=MODEL_NAME, config=config)
    active_sessions[session_id] = chat
    return chat

def generate_stream(message: str, page_context: str = None, session_id: str = None):
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
```

---

The RAG corpus, the correct location, the correct model name, butSince we are currently using an in-memory dictionary (`active_sessions = {}`) to store the conversation history, all user chat history will reset if your Python server reboots; would you like instructions on how to connect this to a lightweight database (like Redis or Firestore) for production-grade memory persistence?

## My response

We sent you one screenshot of the agent studio we were using, from which you derived a whole bunch of information, such as the Rag Corpus, the correct location, the correct model name. I'm sure there's other information that you may still need that we did not send. That was just one screenshot of one window.

Please determine what is still needed and what we need to send you in order for this code to have everything it needs to fully integrate with the Vertex AI GenAI Studio with a Vertex RAG API

---

## Remote agent response

You are absolutely right to double-check this. While the exported script and that single screenshot gave us the foundational plumbing—the model, location, corpus ID, and system instructions—the GenAI Studio interface has several background configurations that can drastically alter how the chatbot behaves in production.

If these aren't perfectly synced, your backend might randomly block answers, truncate responses, or hallucinate differently than what you saw in your testing.

Here is the exact information we still need to extract from your GenAI Studio setup to ensure a 1:1 match with your testing environment:

1. Safety Settings (Critical)
   By default, the Vertex API applies strict safety thresholds that might block legitimate technical answers if it misunderstands the context (e.g., if a component name sounds vaguely dangerous or if it misinterprets electrical terminology).

What to look for: In the right-hand panel of the GenAI Studio, look for the Safety Settings tab or section.

What I need: The specific block thresholds (e.g., "Block none", "Block few", "Block some") for:

Hate speech

Dangerous content

Sexually explicit

Harassment

2. Advanced Generation Parameters
   We extracted temperature=0.1 and top_p=0.1 from the exported script, but there are a few other knobs that dictate how the model types its response.

What to look for: In the right-hand configuration panel, under the model selection.

What I need: * Max Output Tokens: This dictates how long the bot's response can be. If it's too low, the bot will cut off mid-sentence.

Top-K: (This is the model's Top-K, distinct from the RAG Top-K).

Stop Sequences: Did you define any specific words or characters that tell the bot to immediately stop generating text?

3. Few-Shot Examples (Prompt Design)
   Sometimes, system instructions aren't enough, and developers will provide "Examples" in the studio interface (e.g., User Input: "What is X?" -> Model Output: "X is Y.").

What to look for: Look in the main prompt window, usually under or next to the System Instructions box, for a section called "Examples" or "Few-shot prompting."

What I need: If you added any specific Q&A examples there to train its formatting, I need those so we can inject them into the GenerateContentConfig.

4. RAG Distance / Similarity Thresholds
   We know the bot pulls the top 10 documents (similarity_top_k=10), but we don't know the quality threshold of those documents.

What to look for: Look near where you attached the RAG Corpus (often under a "Tools" or "Grounding" menu).

What I need: Is there a Vector distance threshold or Similarity score threshold applied? (e.g., a setting that says "Only use documents with a relevance score above 0.4").

How to get this to me:
You can either take screenshots of the right-hand configuration pane and the Safety/Advanced tabs in the GenAI Studio, or you can just click the "Get Code" / "Export" button again, ensure all tabs are expanded, and paste the resulting JSON or Python dictionary payload.

Did you happen to adjust the Safety Settings when you were initially building "Test Agent 1", or did you leave them on Google's default configuration?

---

## My Response to Remote Agent

1. I've attached a screenshot of the right-hand configuration pane.
2. I've attached a screenshot of the safety filter settings.
3. I've attached a screenshot of the top-K settings.
4. I've attached the agent definition from the code of the Google agent platform for test case one (See 4th screenshot attached)

---

## Remote Agent Response

Thank you for providing these detailed screenshots and the complete `Agent Definition.py` export. This is exactly the missing puzzle piece needed to bridge the gap between what you see in the Studio and what happens in the code.

By cross-referencing your screenshots with the new python export, I have identified **four critical differences** that we must update in our `main.py` to achieve a 1:1 behavioral match.

Here is exactly what we missed and how to implement it.

### 1. Safety Settings ("Block Most")

Your UI screenshot shows all safety filters are set to "Block most". In the API code, this maps to the strictest threshold: `BLOCK_LOW_AND_ABOVE`. Without this, the raw API defaults to a much more permissive threshold.

### 2. Output Tokens & "Thinking" Level

Your model is configured to generate extremely long responses if necessary (`max_output_tokens=65535`). Furthermore, you have the new Gemini "Thinking" feature enabled and set to "LOW". This means the model generates internal reasoning ("Thoughts" in your UI screenshot) before outputting the final answer.

### 3. Updated System Instructions

The system instructions in your new `Agent Definition.py` have been significantly updated since your first export. For example, the prompt now asks users if their background is "Technical" or "Non-Technical" instead of "Matric" or "Engineering Degree". You will need to copy the new `si_text1` string from your export into the `SYSTEM_INSTRUCTIONS` variable in `main.py`.

### 4. The "Few-Shot" Conversation History (The Biggest Change)

This is the most critical revelation from your `Agent Definition.py` file. Your agent isn't just relying on system instructions; it is relying on a massive list of pre-baked "dummy" conversation turns (the long list of `msg2_text1`, `msg4_text2`, etc., injected into the `contents` array).

Google uses these simulated past conversations to "train" the model on exactly how to format its output, how to cite sources, and how to apologize when it doesn't know something.

### The Required Code Changes for `main.py`

To cleanly integrate all this without cluttering `main.py` with 300 lines of few-shot conversation text, I recommend saving the `contents` array from your `Agent Definition.py` into a separate file or referencing it cleanly.

Here is how you must update the `get_or_create_chat` function in your `main.py` to include the Safety Settings, Thinking Config, Max Tokens, and Few-Shot History:
