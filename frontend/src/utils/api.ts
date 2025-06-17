// Centralized API endpoints and utility functions for frontend

// For frontend in production build: These values are set in runtime environment
// For local development: These values match config.json
// This implementation avoids direct file system access in the browser

const API = {
  AGENT_CARD: '/api/agent/card',
  AGENT_SERVERS: '/api/agent-servers',
  AGENT: '/api/agent',
  AGENT_REFRESH: (agentName: string) => `/api/agent/${encodeURIComponent(agentName)}/refresh`,
  AGENT_DELETE: (agentName: string) => `/api/agent/${encodeURIComponent(agentName)}`,
  TASK: '/api/task',
  LLM_PROVIDER_CONFIG: '/api/llm-provider-config',
  START_BACKEND: '/api/start-backend',
  STOP_BACKEND: '/api/stop-backend',
  DISCOVERY_HEALTH: '/api/discovery-health',
};

// Import configs from the shared file
// Note: These values are the same as in config.json
export const EXPRESS_PORT = 9800; // Express server port
export const PY_BACKEND_PORT = 11000; // Python backend port
export const ENGINE_PORT = 9500; // Agent engine port
export const EXPRESS_URL = `http://localhost:${EXPRESS_PORT}`;
export const PY_BACKEND_URL = `http://localhost:${PY_BACKEND_PORT}`;
export const ENGINE_URL = `http://localhost:${ENGINE_PORT}`;

export default API;
