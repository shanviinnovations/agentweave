import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from fastapi import FastAPI, UploadFile, File, Form, Request, Query, Body, Path
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import base64
import os
import asyncio
from uuid import uuid4
from client import A2AClient
from card_resolver import A2ACardResolver
from utils.types import TaskState, A2AClientHTTPError
from utils.push_notification_auth import PushNotificationReceiverAuth
from utils.shared_config import load_shared_config
import httpx
from pydantic import BaseModel

# Load configuration from central config file
config = load_shared_config()
ENGINE_PORT = config['ENGINE_PORT']
BACKEND_URL = f'http://localhost:{ENGINE_PORT}';
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_all_agent_cards():
    """
    Fetches the server list from the backend API and retrieves agent cards from each backend URL.
    Returns a list of agent card dicts.
    """
    try:
        response = httpx.get(f"{BACKEND_URL}/api/agent-servers", timeout=2)
        if response.status_code != 200:
            return [{"error": f"Failed to fetch server list: {response.text}"}]
        servers_data = response.json()
        #print(f"[PYTHON SERVER] Fetched server list: {servers_data}")
        # Only support dict with 'agents' key
        if isinstance(servers_data, dict) and "agents" in servers_data:
            servers = servers_data["agents"]
        else:
            servers = []
        backend_urls = [f"http://{s['host']}:{s['port']}" for s in servers if 'host' in s and 'port' in s]
        for s in servers:
            print(f"[PYTHON SERVER] Agent {s.get('agent_name', s.get('host'))}:{s.get('port')} status: {s.get('status')} | detail: {s.get('status_detail')}")
        print(f"[PYTHON SERVER] Found {len(backend_urls)} backend URLs: {backend_urls}")
        
        cards = []
        for s, url in zip(servers, backend_urls):
            if s.get('status') != 'running':
                print(f"[PYTHON SERVER] Skipping agent card fetch for {s.get('agent_name', s.get('host'))}:{s.get('port')} due to status: {s.get('status')}")
                continue
            try:
                print(f"[PYTHON SERVER] Fetching agent card from {url}")
                card_resolver = A2ACardResolver(url)
                card = card_resolver.get_agent_card()
                cards.append(card.model_dump(exclude_none=True))
            except Exception as e:
                cards.append({"backendUrl": url, "error": str(e)})
        return cards
    except Exception as e:
        return [{"error": f"Failed to fetch server list: {e}"}]

@app.get("/agent/card")
def get_agent_cards():
    """
    Returns agent cards for all backends in the server list.
    """
    cards = get_all_agent_cards()
    return JSONResponse(content={"cards": cards})

@app.post("/task")
async def create_task(
    id: str = Form(default=None),
    sessionId: str = Form(default=""),
    acceptedOutputModes: str = Form(default=None),
    message: str = Form(default=None),
    agentName: str = Form(default=None),
    agentCard: str = Form(default=None),
    pushNotification: str = Form(default=None)
):
    import json
    #print(f"[PYTHON SERVER] Creating task with id: {id}, sessionId: {sessionId}, agentName: {agentName}, agentCard: {agentCard}")
    if not agentCard:
        return JSONResponse(content={"error": "agentCard is required"}, status_code=400)
    try:
        card = json.loads(agentCard)
        if isinstance(card, dict):
            from utils.types import AgentCard
            card = AgentCard(**card)
    except Exception:
        card = agentCard
    #print(f"[PYTHON SERVER] Creating task with agent card: {card}")
    client = A2AClient(agent_card=card)
    if not sessionId:
        sessionId = uuid4().hex
    taskId = id if id else uuid4().hex
    # Parse acceptedOutputModes and message from JSON
    try:
        accepted_output_modes = json.loads(acceptedOutputModes) if acceptedOutputModes else ["text"]
    except Exception:
        accepted_output_modes = ["text"]
    try:
        message_obj = json.loads(message) if message else None
    except Exception:
        message_obj = None
    payload = {
        "id": taskId,
        "sessionId": sessionId,
        "acceptedOutputModes": accepted_output_modes,
        "message": message_obj,
    }
    if agentName:
        payload["agentName"] = agentName
    if agentCard:
        payload["agentCard"] = card
    # Parse pushNotification if present
    if pushNotification:
        try:
            push_notification_obj = json.loads(pushNotification)
        except Exception:
            push_notification_obj = pushNotification
        payload["pushNotification"] = push_notification_obj
    try:
        taskResult = await client.send_task(payload)
        return JSONResponse(content=taskResult.model_dump(exclude_none=True))
    except A2AClientHTTPError as e:
        return JSONResponse(content={"error": str(e)}, status_code=e.status_code)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/discovery-health")
def discovery_health():
    print("[python-server] /discovery-health endpoint hit")
    try:
        response = httpx.get(f"{BACKEND_URL}/health", timeout=2)
        print(f"[python-server] Forwarded to /health, status: {response.status_code}, body: {response.text}")
        if response.status_code == 200:
            return {"status": "ok"}
        else:
            print(f"[python-server] /discovery-health backend unhealthy: {response.text}")
            return {"status": "down", "detail": response.text}
    except Exception as e:
        print(f"[python-server] /discovery-health exception: {e}")
        return {"status": "down", "detail": str(e)}

@app.get("/agent-servers")
def fetch_agents():
    """
    Fetches the server list from the backend API and returns it as JSON.
    If backend is unavailable, returns empty agents list instead of error.
    """
    try:
        response = httpx.get(f"{BACKEND_URL}/api/agent-servers", timeout=2)
        if response.status_code == 200:
            return JSONResponse(content=response.json())
        else:
            # Backend returned error, but still return successful response with empty agents
            print(f"[python-server] Backend returned {response.status_code}: {response.text}")
            return JSONResponse(content={"agents": [], "backend_status": "error", "backend_error": response.text})
    except Exception as e:
        # Backend is completely unavailable, return empty agents list
        print(f"[python-server] Backend unavailable: {str(e)}")
        return JSONResponse(content={"agents": [], "backend_status": "unavailable", "backend_error": str(e)})

class AgentCreateRequest(BaseModel):
    agent_name: str
    agent_description: str
    agent_prompt: str
    mcp_address: str
    mcp_transport_type: str

@app.post("/agent")
def create_agent(agent: AgentCreateRequest = Body(...)):
    """
    Accepts a JSON payload with agent details and forwards it to the backend discovery server on BACKEND_URL.
    """
    try:
        response = httpx.post(f"{BACKEND_URL}/api/agent", json=agent.dict(), timeout=3)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to forward agent creation: {e}"}, status_code=500)

@app.delete("/agent/{agent_name}")
def delete_agent(agent_name: str = Path(...)):
    """
    Forwards agent deletion to the backend discovery server.
    """
    try:
        print(f"[PYTHON SERVER] Deleting agent: {agent_name}")
        response = httpx.delete(f"{BACKEND_URL}/api/agent/{agent_name}", timeout=3)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to forward agent deletion: {e}"}, status_code=500)

@app.post("/agent/{agent_name}/refresh")
def refresh_agent(agent_name: str = Path(...)):
    """
    Forwards the refresh request to the backend discovery server, which will check and (if needed) start the agent server, then return the updated agent info.
    """
    try:
        response = httpx.post(f"{BACKEND_URL}/api/agent/{agent_name}/refresh", timeout=5)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to forward agent refresh: {e}"}, status_code=500)

@app.get("/llm-provider-config")
def get_llm_provider_config():
    """
    Fetch the current LLM provider config and its fields from backend discovery server.
    """
    try:
        response = httpx.get(f"{BACKEND_URL}/api/llm-provider-config", timeout=2)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to fetch LLM provider config: {e}"}, status_code=500)

@app.post("/llm-provider-config")
def save_llm_provider_config(config: dict = Body(...)):
    """
    Save the LLM provider config fields to backend discovery server.
    """
    try:
        response = httpx.post(f"{BACKEND_URL}/api/llm-provider-config", json=config, timeout=3)
        return JSONResponse(content=response.json(), status_code=response.status_code)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to save LLM provider config: {e}"}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=11000)
