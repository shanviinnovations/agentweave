import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.types import AgentCard, AgentCapabilities, AgentSkill
from backend.src.agent import SUPPORTED_CONTENT_TYPES
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_core.tools import BaseTool

from utils.types import (
    JSONRPCResponse,
    ContentTypeNotSupportedError,
    UnsupportedOperationError,
)
from typing import List
from db import AgentConfigModel


def are_modalities_compatible(
    server_output_modes: List[str], client_output_modes: List[str]
):
    """Modalities are compatible if they are both non-empty
    and there is at least one common element."""
    if client_output_modes is None or len(client_output_modes) == 0:
        return True

    if server_output_modes is None or len(server_output_modes) == 0:
        return True

    return any(x in server_output_modes for x in client_output_modes)


def new_incompatible_types_error(request_id):
    return JSONRPCResponse(id=request_id, error=ContentTypeNotSupportedError())


def new_not_implemented_error(request_id):
    return JSONRPCResponse(id=request_id, error=UnsupportedOperationError())

def get_server_config(agent: AgentConfigModel):
    SERVER_CFG = {
        agent.agent_name: {
            "url": agent.mcp_address.rstrip("/") + "/mcp",
            "transport": agent.mcp_transport_type,
        }
    }
    return SERVER_CFG

async def fetch_skills(agent: AgentConfigModel) -> List[AgentSkill]:
    SERVER_CFG = get_server_config(agent)
    try:
        client_cm = MultiServerMCPClient(SERVER_CFG)
        tools: list[BaseTool] = await client_cm.get_tools()
    except Exception as e:
        print("Exception in fetch_skills:")
        # import traceback
        # traceback.print_exc()
        raise RuntimeError(f"MCP server is not running or not reachable: {e}")
    skills = []
    for tool in tools:
        name = getattr(tool, "name", "")
        description = getattr(tool, "description", "")
        skill_id = name.replace(" ", "_")
        skills.append(AgentSkill(id=skill_id, name=name, description=description))
    return skills


async def get_agent_card(
    agent: AgentConfigModel
) -> AgentCard:
    capabilities = AgentCapabilities(streaming=False, pushNotifications=True)
    skills = await fetch_skills(agent)
    agent_card = AgentCard(
        name=agent.agent_name,
        description=agent.agent_description,
        url=f"http://{agent.host}:{agent.port}/",
        version="1.0.0",
        defaultInputModes=SUPPORTED_CONTENT_TYPES,
        defaultOutputModes=SUPPORTED_CONTENT_TYPES,
        capabilities=capabilities,
        skills=skills,
    )
    return agent_card

def get_next_agent_port(start_port: int = 10000, exclude_ports=None) -> int:
    """
    Returns the next available port for a new agent by checking all existing agent ports in the DB,
    and optionally skipping ports in exclude_ports.
    """
    from db import MongoDBClient
    agents = MongoDBClient.get_all_agents()
    used_ports = {int(agent.port) for agent in agents if hasattr(agent, 'port') and agent.port is not None}
    if exclude_ports:
        used_ports.update(exclude_ports)
    port = start_port
    while port in used_ports:
        port += 1
    return port
