import os
import logging
import asyncio
import signal
import socket
import json
from dotenv import load_dotenv
from src.task_manager import AgentTaskManager
from src.helpers import get_agent_card, get_next_agent_port, get_server_config, fetch_skills
from utils.push_notification_auth import PushNotificationSenderAuth
from src.llm_provider import get_llm_provider_config
import uvicorn
from fastapi import FastAPI, Body, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from db import MongoDBClient, AgentConfigModel
from src.base_server import BaseA2AServer
from typing import Dict, Any
from utils.logger import get_logger
logger = get_logger(__name__)

def get_agent_instance(agent: AgentConfigModel, provider):
    kwargs = get_llm_provider_config(provider)
    from backend.src.agent import Agent
    return Agent(prompt=agent.agent_prompt, servers_cfg=get_server_config(agent), **kwargs)

async def run_starlette_app(app, host, port, server_ref=None):
    config = uvicorn.Config(app, host=host, port=port, log_level="info")
    server = uvicorn.Server(config)
    if server_ref is not None:
        server_ref["uvicorn_server"] = server
    await server.serve()

def get_llm_provider_and_config():
    """
    Fetch the current LLM provider and its fields from the DB (or .env as fallback).
    Returns (provider, config_dict)
    """
    config = MongoDBClient.get_llm_provider_config()
    if config:
        provider = config.get("LLM_PROVIDER") or config.get("provider")
        return provider, config
    # fallback: return from env
    import os
    provider = os.getenv("LLM_PROVIDER", "azure")
    result = {"LLM_PROVIDER": provider}
    if provider == "openai":
        result["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")
    elif provider == "google":
        result["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")
    elif provider == "azure":
        result["AZURE_OPENAI_ENDPOINT"] = os.getenv("AZURE_OPENAI_ENDPOINT", "")
        result["AZURE_OPENAI_API_KEY"] = os.getenv("AZURE_OPENAI_API_KEY", "")
        result["AZURE_OPENAI_API_VERSION"] = os.getenv("OPENAI_API_VERSION", "")
    return provider, result

async def create_server(agent: AgentConfigModel):
    host = agent.host
    port = int(agent.port)
    provider, provider_config = get_llm_provider_and_config()
    _agent_card = await get_agent_card(agent)
    agent_inst = get_agent_instance(agent, provider)
    # Optionally, pass provider_config to agent_inst if needed
    notification_sender_auth = PushNotificationSenderAuth()
    notification_sender_auth.generate_jwk()
    server = BaseA2AServer(
        host=host,
        port=port,
        agent_card=_agent_card,
        task_manager=AgentTaskManager(agent=agent_inst, notification_sender_auth=notification_sender_auth)
    )
    server.app.add_route(
        "/.well-known/jwks.json", notification_sender_auth.handle_jwks_endpoint, methods=["GET"]
    )
    return server

# --- FastAPI app for server discovery ---
app = FastAPI()

@app.get("/api/agent-servers")
async def list_agents_with_status():
    """
    Returns all agents from the DB, with an extra field 'status' (detailed connection status),
    based on socket connection to their host/port and MCP tool connectivity.
    """
    import errno
    import time
    try:
        db_agents = MongoDBClient.get_all_agents()
        agents = []
        for agent in db_agents:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            status = "unknown"
            error_detail = None
            mcp_failed = False
            try:
                s.connect((agent.host, int(agent.port)))
                status = "running"
            except socket.timeout:
                status = "timeout"
            except ConnectionRefusedError:
                status = "connection refused"
            except OSError as e:
                if e.errno == errno.ECONNREFUSED:
                    status = "connection refused"
                elif e.errno == errno.EHOSTUNREACH:
                    status = "host unreachable"
                elif e.errno == errno.ENETUNREACH:
                    status = "network unreachable"
                else:
                    status = f"oserror ({e.errno})"
                    error_detail = str(e)
            except Exception as e:
                status = "error"
                error_detail = str(e)
            finally:
                s.close()
            # If running, check MCP tool connection
            if status == "running":
                try:
                    await fetch_skills(agent)
                except Exception as mcp_exc:
                    status = "mcp error"
                    error_detail = f"MCP fetch_skills failed: {str(mcp_exc)}"
                    mcp_failed = True
            agent_dict = agent.dict()
            agent_dict["status"] = status
            agent_dict["status_checked_at"] = int(time.time())
            # Set status_detail
            agent_dict["status_detail"] = get_status_detail(status)
            agents.append(agent_dict)
        return JSONResponse(content={"agents": agents})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

class AgentCreateRequest(BaseModel):
    agent_name: str
    agent_description: str
    agent_prompt: str
    mcp_address: str
    mcp_transport_type: str

@app.post("/api/agent")
async def create_agent(agent: AgentCreateRequest = Body(...)):
    """
    Accepts a JSON payload with agent details and returns the created agent config.
    Prevents creation if agent_name already exists.
    Starts the agent server and only returns after the server is running and port is finalized.
    """
    try:
        # Check if agent_name already exists
        db_agents = MongoDBClient.get_all_agents()
        if any(a.agent_name == agent.agent_name for a in db_agents):
            return JSONResponse(content={"error": f"Agent with name '{agent.agent_name}' already exists."}, status_code=400)
        host = "localhost"
        port = get_next_agent_port()
        agent_data = agent.dict()
        agent_data["host"] = host
        agent_data["port"] = port
        agent_model = AgentConfigModel(**agent_data)
        inserted_id = MongoDBClient.save_agent_config(agent_model)
        agent_dict = agent_model.dict()
        agent_dict["id"] = inserted_id
        # Start the agent server synchronously and wait for port assignment
        await start_agent_servers([agent_model])
        # Fetch the latest agent config from DB (in case port changed)
        updated_agent = next((a for a in MongoDBClient.get_all_agents() if a.agent_name == agent.agent_name), None)
        if updated_agent:
            agent_dict = updated_agent.dict()
            agent_dict["id"] = inserted_id
        return JSONResponse(content={"agent": agent_dict}, status_code=201)
    except RuntimeError as e:
        # Custom error for MCP server not running
        return JSONResponse(content={"error": str(e)}, status_code=502)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

# Global registry to track running agent server tasks and server instances
AGENT_SERVER_TASKS = {}  # {agent_name: {"task": ..., "server": ...}}

def is_port_in_use(host, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.settimeout(0.5)
        s.connect((host, int(port)))
        return True
    except Exception:
        return False
    finally:
        s.close()

async def start_agent_servers(agent_models, max_retries=5, retry_delay=1):
    tasks = []
    for agent in agent_models:
        retries = 0
        tried_ports = set()
        while retries < max_retries:
            if not is_port_in_use(agent.host, agent.port) and agent.port not in tried_ports:
                break
            tried_ports.add(agent.port)
            print(f"Port {agent.port} is in use, getting next port and retrying...")
            next_port = get_next_agent_port(exclude_ports=tried_ports)
            # Avoid looping on the same ports
            while next_port in tried_ports:
                tried_ports.add(next_port)
                next_port = get_next_agent_port(exclude_ports=tried_ports)
            agent.port = next_port
            MongoDBClient.update_agent_port_by_name(agent.agent_name, agent.port)
            await asyncio.sleep(retry_delay)
            retries += 1
        if is_port_in_use(agent.host, agent.port):
            print(f"Port {agent.port} is still in use after {max_retries} retries. Skipping agent {agent.agent_name}.")
            continue
        server = await create_server(agent)
        print(f"Starting {agent.agent_name} agent server on {agent.host}:{agent.port}")
        server_ref = {}
        task = asyncio.create_task(run_starlette_app(server.app, server.host, agent.port, server_ref))
        AGENT_SERVER_TASKS[agent.agent_name] = {"task": task, "server": server, "uvicorn_server": server_ref}
        tasks.append(task)
    return tasks

@app.delete("/api/agent/{agent_name}")
def delete_agent(agent_name: str = Path(...)):
    """
    Deletes an agent by agent_name. Stops the agent server if running, then deletes from DB.
    """
    try:
        print(f"[API] Deleting agent: {agent_name}")
        db_agents = MongoDBClient.get_all_agents()
        agent = next((a for a in db_agents if a.agent_name == agent_name), None)
        if not agent:
            return JSONResponse(content={"error": f"Agent '{agent_name}' not found."}, status_code=404)
        entry = AGENT_SERVER_TASKS.get(agent_name)
        if entry:
            uvicorn_server = entry.get("uvicorn_server", {}).get("uvicorn_server")
            if uvicorn_server:
                uvicorn_server.should_exit = True
            server = entry.get("server")
            task = entry.get("task")
            if hasattr(server, "shutdown") and asyncio.iscoroutinefunction(server.shutdown):
                try:
                    asyncio.get_event_loop().run_until_complete(server.shutdown())
                except Exception:
                    pass
            if task:
                task.cancel()
                try:
                    asyncio.get_event_loop().run_until_complete(task)
                except Exception:
                    pass
            AGENT_SERVER_TASKS.pop(agent_name, None)
        deleted_count = MongoDBClient.delete_agent_by_name(agent_name)
        if deleted_count == 0:
            return JSONResponse(content={"error": f"Agent '{agent_name}' not found in DB."}, status_code=404)
        return JSONResponse(content={"message": f"Agent '{agent_name}' deleted and server stopped."}, status_code=200)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

def check_agent_socket_connection(agent):
    """Check if agent's socket is connectable."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect((agent.host, int(agent.port)))
        return True
    except Exception:
        return False
    finally:
        s.close()

async def check_mcp_tool_connection(agent, loop=None):
    """Try to fetch skills from MCP tool, returns (success, error_detail)."""
    try:
        await fetch_skills(agent)
        return True, None
    except Exception as mcp_exc:
        return False, f"MCP fetch_skills failed: {str(mcp_exc)}"

async def try_start_agent_server(agent):
    """Try to start the agent server, returns error_detail if fails."""
    import asyncio
    try:
        await start_agent_servers([agent])
        return None
    except Exception as e:
        return str(e)

def get_status_detail(status):
    if status == "mcp error":
        return "MCP tool connection failed"
    elif status == "running":
        return "Connected to agent and MCP tool"
    elif status == "not connected":
        return "Agent server not running or unreachable"
    elif status == "timeout":
        return "Connection timed out"
    elif status == "connection refused":
        return "Connection refused by agent server"
    elif status == "host unreachable":
        return "Host unreachable"
    elif status == "network unreachable":
        return "Network unreachable"
    elif status.startswith("oserror"):
        return "OS error during connection"
    elif status == "error":
        return "Unknown error during connection"
    return ""

@app.post("/api/agent/{agent_name}/refresh")
async def refresh_agent(agent_name: str = Path(...)):
    """
    Refreshes the status of a single agent by name. If not connected, tries to start the server, then re-checks connection. Updates state and returns agent info.
    """
    import errno
    import time
    import socket
    try:
        logging.info(f"[API] Refreshing agent: {agent_name}")
        db_agents = MongoDBClient.get_all_agents()
        agent = next((a for a in db_agents if a.agent_name == agent_name), None)
        if not agent:
            return JSONResponse(content={"error": f"Agent '{agent_name}' not found."}, status_code=404)
        # 1. Check socket connection
        connected = check_agent_socket_connection(agent)
        status = "running" if connected else "not connected"
        error_detail = None
        mcp_failed = False
        # 2. If connected, check MCP tool connection
        if connected:
            ok, mcp_error = await check_mcp_tool_connection(agent)
            if ok:
                status = "running"
            else:
                status = "mcp error"
                error_detail = mcp_error
                mcp_failed = True
        # 3. If not connected and not MCP error, try to start server and re-check
        if not connected and not mcp_failed:
            start_error = await try_start_agent_server(agent)
            if start_error:
                logging.error(f"[API] Error starting agent server for {agent_name}: {start_error}")
                # On error, return agent data with status 'error'
                agent_dict = agent.dict()
                agent_dict["status"] = "error"
                agent_dict["status_checked_at"] = int(time.time())
                agent_dict["status_detail"] = get_status_detail("error")
                return JSONResponse(content={"agent": agent_dict}, status_code=200)
            # Re-check connection
            connected2 = check_agent_socket_connection(agent)
            if connected2:
                ok, mcp_error = await check_mcp_tool_connection(agent)
                if ok:
                    status = "running"
                else:
                    status = "mcp error"
                    error_detail = mcp_error
            else:
                status = "not connected"
        agent_dict = agent.dict()
        agent_dict["status"] = status
        agent_dict["status_checked_at"] = int(time.time())
        agent_dict["status_detail"] = get_status_detail(status)
        return JSONResponse(content={"agent": agent_dict})
    except Exception as e:
        logging.error(f"[API] Error refreshing agent {agent_name}: {str(e)}")
        # On error, return agent data with status 'error'
        if 'agent' in locals() and agent:
            agent_dict = agent.dict()
            agent_dict["status"] = "error"
            agent_dict["status_checked_at"] = int(time.time())
            agent_dict["status_detail"] = get_status_detail("error")
            return JSONResponse(content={"agent": agent_dict}, status_code=200)
        else:
            return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/shutdown")
async def shutdown_engine():
    """
    Gracefully shutdown the entire backend engine and all agent servers.
    This endpoint is called from the UI close engine button.
    """
    try:
        logger.info("[API] Shutdown request received")
        
        # 1. Stop all agent servers
        shutdown_tasks = []
        for agent_name, entry in AGENT_SERVER_TASKS.items():
            logger.info(f"[Shutdown] Stopping agent server: {agent_name}")
            
            # Stop uvicorn server gracefully
            uvicorn_server = entry.get("uvicorn_server", {}).get("uvicorn_server")
            if uvicorn_server:
                uvicorn_server.should_exit = True
            
            # Stop server if it has shutdown method
            server = entry.get("server")
            if hasattr(server, "shutdown") and asyncio.iscoroutinefunction(server.shutdown):
                try:
                    shutdown_tasks.append(server.shutdown())
                except Exception as e:
                    logger.error(f"[Shutdown] Error shutting down server for {agent_name}: {e}")
            
            # Cancel the task
            task = entry.get("task")
            if task:
                task.cancel()
        
        # Wait for all shutdowns to complete
        if shutdown_tasks:
            await asyncio.gather(*shutdown_tasks, return_exceptions=True)
        
        # Clear the registry
        AGENT_SERVER_TASKS.clear()
        
        logger.info("[API] All agent servers stopped")
        
        # 2. Schedule the main server shutdown after response is sent
        def schedule_main_shutdown():
            import threading
            import time
            import os
            import signal
            
            def delayed_shutdown():
                time.sleep(1)  # Give time for response to be sent
                logger.info("[Shutdown] Shutting down main engine server")
                os.kill(os.getpid(), signal.SIGTERM)
            
            thread = threading.Thread(target=delayed_shutdown)
            thread.daemon = True
            thread.start()
        
        schedule_main_shutdown()
        
        return JSONResponse(content={
            "message": "Backend engine and all agent servers are shutting down",
            "status": "shutting_down"
        }, status_code=200)
        
    except Exception as e:
        logger.error(f"[API] Error during shutdown: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

# --- LLM Provider Config Endpoints ---

@app.get("/api/llm-provider-config")
async def get_llm_provider_config_from_db():
    """
    Fetch the current LLM provider and its fields from the DB (or .env as fallback).
    """
    provider, config = get_llm_provider_and_config()
    # Remove MongoDB _id if present
    if config and "_id" in config:
        config["id"] = str(config.pop("_id"))
    return config

@app.post("/api/llm-provider-config")
async def save_llm_provider_config(payload: Dict[str, Any]):
    """
    Save the LLM provider and its fields to the DB and set as environment variables.
    """
    db = MongoDBClient.get_database("agentweave")
    collection = db["llm_provider_config"]
    collection.delete_many({})  # Only one config at a time
    result = collection.insert_one(payload)

    # Set as environment variables for the current process
    set_llm_env_vars_from_config(payload)
    return {"success": True, "id": str(result.inserted_id)}

def set_llm_env_vars_from_config(config: dict):
    """
    Set LLM provider config values as environment variables in the current process.
    """
    env_keys = [
        "LLM_PROVIDER",
        "OPENAI_API_KEY",
        "GOOGLE_API_KEY",
        "AZURE_OPENAI_ENDPOINT",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_API_VERSION",
        "OPENAI_API_VERSION"
    ]
    # logger.info(f"Setting LLM provider config as environment variables: {config}")
    for key in env_keys:
        if key in config:
            os.environ[key] = str(config[key])

if __name__ == "__main__":
    load_dotenv(override=True)  # Load .env file if present
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--multi", action="store_true", help="Run multiple agents as defined in AGENT_CONFIGS list")
    parser.add_argument("--host", default="localhost", help="Host to run the server on (single mode)")
    parser.add_argument("--port", type=int, default=10000, help="Port to run the server on (single mode)")
    parser.add_argument("--agent", default="github", help="Agent to run (github, confluence, etc.) (single mode)")
    args = parser.parse_args()

    # --- Set LLM provider config as env vars from MongoDB if present ---
    config = MongoDBClient.get_llm_provider_config()
    if config:
        set_llm_env_vars_from_config(config)

    async def run_discovery_server():
        # Load configuration from shared config file
        from utils.shared_config import load_shared_config
        shared_config = load_shared_config()
        engine_port = shared_config["ENGINE_PORT"]
        
        # Run the FastAPI discovery server on configured port
        config = uvicorn.Config("main:app", host="0.0.0.0", port=engine_port, log_level="info", reload=False)
        server = uvicorn.Server(config)
        await server.serve()

    async def main():
        tasks = []
        # Start the discovery server on port 9500
        tasks.append(asyncio.create_task(run_discovery_server()))

        from pymongo.errors import ServerSelectionTimeoutError, PyMongoError
        try:
            db_agents = MongoDBClient.get_all_agents()
        except (ServerSelectionTimeoutError, PyMongoError) as e:
            logger.error(f"MongoDB connection error: {e}")
            print(f"[Startup] MongoDB is not running or not reachable: {e}")
            import sys
            sys.exit(1)
        except Exception as e:
            logger.error(f"Unexpected error during MongoDB connection: {e}")
            print(f"[Startup] Unexpected error: {e}")
            import sys
            sys.exit(1)

        try:
            tasks += await start_agent_servers(db_agents)
        except RuntimeError as e:
            logger.error(f"Startup error: {e}")
            print(f"[Startup] MCP server is not running or not reachable: {e}")
            # Optionally, you could exit or continue depending on your needs

        # Handle shutdown signals
        loop = asyncio.get_running_loop()
        stop_event = asyncio.Event()

        def shutdown():
            stop_event.set()

        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, shutdown)

        try:
            await stop_event.wait()
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    asyncio.run(main())
