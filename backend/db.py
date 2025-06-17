# db.py
"""
MongoDB connection setup for the backend. Uses a singleton pattern to ensure only one client instance.
"""
from pymongo import MongoClient
from typing import Optional
from pydantic import BaseModel, Field

class MongoDBClient:
    _instance: Optional[MongoClient] = None

    @classmethod
    def get_client(cls) -> MongoClient:
        if cls._instance is None:
            cls._instance = MongoClient("mongodb://localhost:27017")
        return cls._instance

    @classmethod
    def get_database(cls, db_name: str):
        client = cls.get_client()
        return client[db_name]

    @classmethod
    def get_agent_collection(cls):
        db = cls.get_database("agentweave")  # Use your DB name
        return db["agents"]  # Collection name: agents

    @classmethod
    def save_agent_config(cls, agent_config: "AgentConfigModel") -> str:
        collection = cls.get_agent_collection()
        data = agent_config.dict(exclude_none=True)
        result = collection.insert_one(data)
        return str(result.inserted_id)

    @classmethod
    def get_all_agents(cls):
        collection = cls.get_agent_collection()
        agents = list(collection.find())
        # Convert ObjectId to string for each agent and return as AgentConfigModel
        agent_models = []
        for agent in agents:
            agent["id"] = str(agent.pop("_id"))
            agent_models.append(AgentConfigModel(**agent))
        return agent_models

    @classmethod
    def delete_agent_by_name(cls, agent_name: str) -> int:
        collection = cls.get_agent_collection()
        result = collection.delete_one({"agent_name": agent_name})
        return result.deleted_count

    @staticmethod
    def update_agent_port_by_name(agent_name, new_port):
        """
        Update the port of an agent by agent_name.
        """
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017/")
        db = client["agentweave"]
        agents = db["agents"]
        result = agents.update_one({"agent_name": agent_name}, {"$set": {"port": new_port}})
        return result.modified_count

    @classmethod
    def get_llm_provider_collection(cls):
        db = cls.get_database("agentweave")
        return db["llm_provider_config"]

    @classmethod
    def save_llm_provider_config(cls, config: dict) -> str:
        collection = cls.get_llm_provider_collection()
        collection.delete_many({})  # Only keep one config document
        result = collection.insert_one(config)
        return str(result.inserted_id)

    @classmethod
    def get_llm_provider_config(cls) -> Optional[dict]:
        collection = cls.get_llm_provider_collection()
        doc = collection.find_one()
        if doc:
            doc["id"] = str(doc.pop("_id"))
            return doc
        return None

class AgentConfigModel(BaseModel):
    agent_name: str = Field(...)
    agent_description: str = Field(...)
    agent_prompt: str = Field(...)
    mcp_address: str = Field(...)
    mcp_transport_type: str = Field(...)
    host: str = Field(...)
    port: int = Field(...)
    # Optionally, add an id field for MongoDB's _id
    id: Optional[str] = None
