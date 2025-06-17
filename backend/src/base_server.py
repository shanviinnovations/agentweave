from starlette.applications import Starlette
from starlette.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from starlette.requests import Request
from utils.types import (
    AgentCard,
    A2ARequest,
    JSONRPCResponse,
    InvalidRequestError,
    JSONParseError,
    GetTaskRequest,
    CancelTaskRequest,
    SendTaskRequest,
    SetTaskPushNotificationRequest,
    GetTaskPushNotificationRequest,
    InternalError,
    TaskResubscriptionRequest,
    SendTaskStreamingRequest,
)
from pydantic import ValidationError
import json
import logging
from typing import AsyncIterable, Any
from utils.logger import get_logger
logger = get_logger(__name__)

class BaseA2AServer:
    def __init__(
        self,
        host="0.0.0.0",
        port=5000,
        endpoint="/",
        agent_card: AgentCard = None,
        task_manager = None,
    ):
        self.host = host
        self.port = port
        self.endpoint = endpoint
        self.task_manager = task_manager
        self.agent_card = agent_card
        self.app = Starlette()
        self.app.add_route(self.endpoint, self._process_request, methods=["POST"])
        self.app.add_route(
            "/.well-known/agent.json", self._get_agent_card, methods=["GET"]
        )
        self.app.add_route("/health", self.health, methods=["GET"])

    async def start(self, run_starlette_app):
        if self.agent_card is None:
            raise ValueError("agent_card is not defined")
        if self.task_manager is None:
            raise ValueError("task_manager is not defined")
        await run_starlette_app(self.app, host=self.host, port=self.port)

    def _get_agent_card(self, request: Request) -> JSONResponse:
        return JSONResponse(self.agent_card.model_dump(exclude_none=True))

    async def _process_request(self, request: Request):
        try:
            body = await request.json()
            json_rpc_request = A2ARequest.validate_python(body)

            result = await self._handle_task_request(json_rpc_request)
            return self._create_response(result)

        except Exception as e:
            return self._handle_exception(e)

    async def _handle_task_request(self, json_rpc_request):
        if isinstance(json_rpc_request, GetTaskRequest):
            return await self.task_manager.on_get_task(json_rpc_request)
        elif isinstance(json_rpc_request, SendTaskRequest):
            return await self.task_manager.on_send_task(json_rpc_request)
        elif isinstance(json_rpc_request, SendTaskStreamingRequest):
            return await self.task_manager.on_send_task_subscribe(json_rpc_request)
        elif isinstance(json_rpc_request, CancelTaskRequest):
            return await self.task_manager.on_cancel_task(json_rpc_request)
        elif isinstance(json_rpc_request, SetTaskPushNotificationRequest):
            return await self.task_manager.on_set_task_push_notification(json_rpc_request)
        elif isinstance(json_rpc_request, GetTaskPushNotificationRequest):
            return await self.task_manager.on_get_task_push_notification(json_rpc_request)
        elif isinstance(json_rpc_request, TaskResubscriptionRequest):
            return await self.task_manager.on_resubscribe_to_task(json_rpc_request)
        else:
            logger.warning(f"Unexpected request type: {type(json_rpc_request)}")
            raise ValueError(f"Unexpected request type: {type(json_rpc_request)}")

    def _handle_exception(self, e: Exception) -> JSONResponse:
        if isinstance(e, json.decoder.JSONDecodeError):
            json_rpc_error = JSONParseError()
        elif isinstance(e, ValidationError):
            json_rpc_error = InvalidRequestError(data=json.loads(e.json()))
        else:
            logger.error(f"Unhandled exception: {e}")
            json_rpc_error = InternalError()

        response = JSONRPCResponse(id=None, error=json_rpc_error)
        return JSONResponse(response.model_dump(exclude_none=True), status_code=400)

    def _create_response(self, result: Any) -> JSONResponse | EventSourceResponse:
        if isinstance(result, AsyncIterable):
            async def event_generator(result) -> AsyncIterable[dict[str, str]]:
                async for item in result:
                    yield {"data": item.model_dump_json(exclude_none=True)}
            return EventSourceResponse(event_generator(result))
        elif isinstance(result, JSONRPCResponse):
            return JSONResponse(result.model_dump(exclude_none=True))
        else:
            logger.error(f"Unexpected result type: {type(result)}")
            raise ValueError(f"Unexpected result type: {type(result)}")

    async def health(self, request: Request) -> JSONResponse:
        logger.info("[BASE AGENT] /health endpoint hit")
        response = {"status": "ok"}
        logger.info(f"[BASE AGENT] /health response: {response}")
        return JSONResponse(response)
