import API from '../utils/api';

// Utility to fetch agent card from backend
export async function fetchAgentCard() {
  const res = await fetch(API.AGENT_CARD);
  if (!res.ok) throw new Error('Failed to fetch agent card');
  return res.json();
}

// Utility to start backend engine
export async function startBackendEngine() {
  const res = await fetch(API.START_BACKEND, { method: 'POST' });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    // Return the error message from backend if available
    const errorMsg = data.error || data.output || 'Failed to start backend engine';
    // Instead of throwing, return a consistent object for EngineView
    return { success: false, error: errorMsg, output: data.output };
  }
  return data;
}

// Utility to stop backend engine
export async function stopBackendEngine() {
  try {
    const res = await fetch(API.STOP_BACKEND, { method: 'POST' });
    const data = await res.json();
    
    if (!res.ok) {
      // Handle different types of errors
      const errorMsg = data.error || data.detail || 'Failed to stop backend engine';
      const suggestion = data.suggestion || '';
      throw new Error(suggestion ? `${errorMsg}. ${suggestion}` : errorMsg);
    }
    
    return data;
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Failed to connect to backend service. The service may already be stopped.');
    }
    throw error;
  }
}

// Utility to check health of backend discovery server (proxied through Express server)
export async function checkDiscoveryHealth() {
  try {
    const res = await fetch(API.DISCOVERY_HEALTH);
    const data = await res.json();
    if (!res.ok || data.status === 'down') {
      console.log('[agentApi] /api/discovery-health error:', data.detail || res.statusText);
      throw new Error(data.detail || 'Discovery server is down');
    }
    return data;
  } catch (err) {
    console.error('[agentApi] /api/discovery-health fetch error:', err);
    throw err;
  }
}

// Utility to fetch list of running agent servers from backend discovery server (proxied through Express server)
export async function fetchAgentServers(retries = 3, delay = 1000, retryOnEmpty = false): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(API.AGENT_SERVERS);
      // Even if response is not ok, try to parse JSON to get graceful error response
      const data = await res.json();
      
      // If we got a response (even with backend_status indicating unavailable), process it
      if (data) {
        // Log backend status for debugging
        if (data.backend_status) {
          console.log(`[agentApi] Backend status: ${data.backend_status}`, data.backend_error);
        }
        
        // Retry if servers is empty array and retryOnEmpty is true
        if (retryOnEmpty && Array.isArray(data.agents) && data.agents.length === 0 && !data.backend_status) {
          if (attempt === retries - 1) return data;
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        return data;
      }
      
      // If we get here, response was not ok and no JSON data
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      
    } catch (err) {
      console.log(`[agentApi] fetchAgentServers attempt ${attempt + 1} failed:`, err);
      
      // On last attempt, return empty agents list instead of throwing
      if (attempt === retries - 1) {
        console.log('[agentApi] All attempts failed, returning empty agents list');
        return { agents: [], backend_status: 'fetch_failed', backend_error: String(err) };
      }
      
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// Utility to send a chat/task request to backend
export async function sendAgentTask({ prompt, sessionId, usePushNotifications, agentName, agentCard }: {
  prompt: string;
  sessionId: string;
  usePushNotifications: boolean;
  agentName?: string;
  agentCard?: any;
}) {
  const res = await fetch(API.TASK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, sessionId, usePushNotifications, agentName, agentCard }),
  });
  if (!res.ok) {
    let errMsg = 'Failed to send agent task';
    try {
      const err = await res.json();
      errMsg = err.error || err.detail || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

// Utility to create a new agent via backend
export async function createAgent(agent: {
  agent_name: string;
  agent_description: string;
  agent_prompt: string;
  mcp_address: string;
  mcp_transport_type: string;
}) {
  const res = await fetch(API.AGENT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add agent');
  }
  return res.json();
}

// Utility to delete an agent by name
export async function deleteAgent(agent_name: string) {
  const res = await fetch(API.AGENT_DELETE(agent_name), {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete agent');
  }
  return res.json();
}

// Utility to refresh a single agent's status
export async function refreshAgent(agent_name: string) {
  const res = await fetch(API.AGENT_REFRESH(agent_name), {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to refresh agent');
  }
  return res.json();
}
