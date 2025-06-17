import asyncio
from typing import Any, AsyncIterable, Dict
from langchain_core.messages import AIMessage, ToolMessage
from langchain_core.tools import BaseTool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_mcp_adapters.client import MultiServerMCPClient
from dotenv import load_dotenv
from .llm_factory import LLMFactory
from utils.logger import get_logger
logger = get_logger(__name__)

SUPPORTED_CONTENT_TYPES = ["text", "text/plain"]
class Agent:
    def __init__(self, prompt: str, servers_cfg: dict, provider: str, **model_kwargs):
        self._provider = provider
        self._model_kwargs = model_kwargs
        self._graph = None
        self._client_cm = None
        self._memory = MemorySaver()
        self.prompt = prompt  # Set by argument
        self.servers_cfg = servers_cfg  # Set by argument

    async def aclose(self):
        """Gracefully shut down MCP subprocesses / SSE streams."""
        if self._client_cm:
            await self._client_cm.__aexit__(None, None, None)
            self._client_cm = None
        self._graph = None

    async def _ensure_graph(self):
        """Ensure the agent's graph is initialized."""
        if self._graph:
            return
        model = LLMFactory.create(self._provider, **self._model_kwargs)
        logger.info(f"Creating agent graph with prvider: {self._provider}, kwargs: {self._model_kwargs}")
        self._client_cm = MultiServerMCPClient(self.servers_cfg)
        tools: list[BaseTool] = await self._client_cm.get_tools()
        self._graph = create_react_agent(
            model=model,
            tools=tools,
            checkpointer=self._memory,
            prompt=self.prompt,
        )

    async def ainvoke(self, query: str, session_id: str) -> Dict[str, Any]:
        """Synchronous interaction with the agent."""
        await self._ensure_graph()
        cfg = {"configurable": {"thread_id": session_id}}
        state = await self._graph.ainvoke({"messages": [("user", query)]}, cfg)
        assistant_msg = state["messages"][-1]
        return {
            "is_task_complete": True,
            "require_user_input": False,
            "content": assistant_msg.content
        }

    async def astream(self, query: str, session_id: str) -> AsyncIterable[Dict[str, Any]]:
        """Streaming interaction with the agent."""
        await self._ensure_graph()
        cfg = {"configurable": {"thread_id": session_id}}
        inputs = {"messages": [("user", query)]}
        async for item in self._graph.astream(inputs, cfg, stream_mode="values"):
            msg = item["messages"][-1]
            if isinstance(msg, AIMessage) and msg.tool_calls:
                yield {
                    "is_task_complete": False,
                    "require_user_input": False,
                    "content": "Looking up data...",
                }
            elif isinstance(msg, ToolMessage):
                yield {
                    "is_task_complete": False,
                    "require_user_input": False,
                    "content": "Processing response...",
                }
        # final structured reply
        state = self._graph.get_state(cfg)
        messages = state["messages"] if isinstance(state, dict) else state.values["messages"]
        assistant_msg = messages[-1]
        yield {
            "is_task_complete": True,
            "require_user_input": False,
            "content": assistant_msg.content,
        }