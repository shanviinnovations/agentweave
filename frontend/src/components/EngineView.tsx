import React, { useState } from 'react';
import { startBackendEngine, stopBackendEngine, checkDiscoveryHealth, fetchAgentServers, createAgent, deleteAgent, refreshAgent } from './agentApi';
import AgentDetailsPopup from './AgentDetailsPopup';
import EnvConfigPopup from './EnvConfigPopup';
import { ENGINE_URL } from '../utils/api';

// Shared retry config
const SERVER_LIST_RETRIES = 5;
const SERVER_LIST_RETRY_DELAY = 2000;

const EngineView: React.FC = () => {
  const [serverStarted, setServerStarted] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Update: servers now stores full agent objects, not just name/host/port
  const [servers, setServers] = React.useState<Array<{
    agent_name: string,
    agent_description: string,
    agent_prompt: string,
    mcp_address: string,
    mcp_transport_type: string,
    host: string,
    port: number,
    id: string,
    status: string,
    status_detail: string, // <-- Add this line for type safety
    status_checked_at: number
  }>>([]);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentMCP, setNewAgentMCP] = useState('');
  const [newAgentMCPTransport, setNewAgentMCPTransport] = useState('streamable_http');
  const [addAgentError, setAddAgentError] = useState<string | null>(null);
  const [detailsPopupOpen, setDetailsPopupOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<typeof servers[0] | null>(null);
  const [envPopupOpen, setEnvPopupOpen] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);
  // Add a new state to control config popup for updates
  const [configUpdateMode, setConfigUpdateMode] = useState(false);

  // Check discovery server health and fetch server list on mount
  React.useEffect(() => {
    checkDiscoveryHealth()
      .then(() => {
        setServerStarted(true);
        // Optimized: Try fetching server list up to 3 times, 2s apart, stop early if found
        let tries = 0;
        let found = false;
        const tryFetch = async () => {
          while (tries < SERVER_LIST_RETRIES && !found) {
            const data = await fetchAgentServers();
            setServers((data.agents || []).map((agent: any) => ({
              ...agent,
              status_detail: agent.status_detail || agent.status // ensure type safety
            })));
            if (data.agents && data.agents.length > 0) {
              found = true;
            } else {
              await new Promise(res => setTimeout(res, SERVER_LIST_RETRY_DELAY));
            }
            tries++;
          }
        };
        tryFetch();
      })
      .catch(() => setServerStarted(false));
  }, []);

  const handleStartEngine = async () => {
    setStarting(true);
    setError(null);
    try {
      const result = await startBackendEngine();
      if (result && result.success === false) {
        setError(result.error || result.output || 'Failed to start backend');
        setStarting(false);
        return;
      }
      // Poll for discovery health every 2 seconds, up to 10 seconds
      const maxAttempts = 5;
      let attempt = 0;
      let healthy = false;
      while (attempt < maxAttempts) {
        try {
          await checkDiscoveryHealth();
          healthy = true;
          break;
        } catch {
          await new Promise(res => setTimeout(res, 2000));
        }
        attempt++;
      }
      if (healthy) {
        setServerStarted(true);
        // Optimized: Try fetching server list up to 3 times, 2s apart, stop early if found
        let tries = 0;
        let found = false;
        while (tries < SERVER_LIST_RETRIES && !found) {
          const data = await fetchAgentServers();
          setServers((data.agents || []).map((agent: any) => ({
            ...agent,
            status_detail: agent.status_detail || agent.status // ensure type safety
          })));
          if (data.agents && data.agents.length > 0) {
            found = true;
          } else {
            await new Promise(res => setTimeout(res, SERVER_LIST_RETRY_DELAY));
          }
          tries++;
        }
      } else {
        setError('Backend did not start in time. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start backend');
    }
    setStarting(false);
  };

  const handleAddAgent = async () => {
    setAddAgentError(null);
    if (!newAgentName || !newAgentDescription || !newAgentPrompt || !newAgentMCP || !newAgentMCPTransport) {
      setAddAgentError('Please fill in all fields.');
      return;
    }
    try {
      await createAgent({
        agent_name: newAgentName,
        agent_description: newAgentDescription,
        agent_prompt: newAgentPrompt,
        mcp_address: newAgentMCP,
        mcp_transport_type: newAgentMCPTransport
      });
      setAddAgentOpen(false);
      clearAgentForm();
      // Use retryOnEmpty=true to wait for the new server to actually start
      const data = await fetchAgentServers(SERVER_LIST_RETRIES, SERVER_LIST_RETRY_DELAY, true);
      setServers((data.agents || []).map((agent: any) => ({
        ...agent,
        status_detail: agent.status_detail || agent.status // ensure type safety
      })));
    } catch (err: any) {
      setAddAgentError(err.message || 'Failed to add agent');
    }
  };

  // Helper function to clear all agent form fields
  const clearAgentForm = () => {
    setNewAgentName('');
    setNewAgentDescription('');
    setNewAgentPrompt('');
    setNewAgentMCP('');
    setNewAgentMCPTransport('streamable_http');
    setAddAgentError(null);
  };

  return (
    <div className="flex flex-col items-center w-full gap-8 mt-16">
      {/* Show EnvConfigPopup for config update only */}
      <EnvConfigPopup
        open={configUpdateMode}
        onClose={() => setConfigUpdateMode(false)}
        onSave={env => {
          localStorage.setItem('envConfig', JSON.stringify(env));
          setEnvConfigured(true);
          setConfigUpdateMode(false);
        }}
      />
      {/* Engine Status Card */}
      <div className="card w-full max-w-lg flex flex-col items-center p-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-block w-3 h-3 rounded-full ${serverStarted ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></span>
          <span className={`font-bold text-base ${serverStarted ? 'text-green-500' : 'text-red-400'}`}>Engine {serverStarted ? 'Running' : 'Stopped'}</span>
        </div>
        {serverStarted && (
          <>
            <div className="mb-2 text-base text-primary font-mono">
              Engine Address: <span className="select-all">{ENGINE_URL}</span>
            </div>
            <div className="flex flex-row gap-4 mb-2">
              <button
                className="btn-primary px-6 py-2 text-base"
                onClick={() => setConfigUpdateMode(true)}
              >
                Set Configuration
              </button>
              <button
                className="btn-accent px-6 py-2 text-base"
                onClick={async () => {
                  setStarting(true);
                  setError(null);
                  try {
                    await stopBackendEngine();
                    setServerStarted(false);
                    setServers([]);
                  } catch (err: any) {
                    setError(err.message || 'Failed to stop backend');
                  }
                  setStarting(false);
                }}
              >
                Close Engine
              </button>
            </div>
          </>
        )}
        {!serverStarted ? (
          <button className="btn-primary px-8 py-3 text-lg mt-2" onClick={handleStartEngine} disabled={starting}>
            {starting ? 'Starting...' : 'Start Engine'}
          </button>
        ) : null}
        {error && <div className="text-red-400 mt-2">{error}</div>}
      </div>

      {/* Servers Card */}
      {serverStarted && (
        <div className="card w-full max-w-lg flex flex-col items-center p-6 mb-4">
          <div className="flex justify-between w-full mb-4">
            <div className="font-bold text-lg">Running Agent Servers</div>
            <button className="btn-primary" onClick={() => {
              // Clear all form fields when opening the Add Agent form
              clearAgentForm();
              setAddAgentOpen(true);
            }}>Add Agent</button>
          </div>
          {servers.length > 0 ? (
            <div className="w-full grid grid-cols-1 gap-4">
              {servers.map(server => (
                <div
                  key={server.agent_name}
                  className="flex items-center gap-4 bg-surface-light border border-primary rounded-xl px-5 py-4 mb-2 w-full shadow-sm cursor-pointer hover:bg-primary/10 transition duration-150 agent-row-hover"
                  onClick={() => { setSelectedAgent(server); setDetailsPopupOpen(true); }}
                >
                  {/* Avatar */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-xl uppercase">
                    {server.agent_name[0]}
                  </div>
                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-primary truncate">{server.agent_name}</div>
                    <div className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                      <span className="font-mono select-all truncate">{`http://${server.host}:${server.port}`}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {/* Connection Status */}
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${server.status === 'running' ? 'bg-green-100 text-green-700' : server.status === 'connection refused' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>{server.status}</span>
                      {/* Status Checked Time */}
                      <span className="text-xs text-zinc-400">{new Date(server.status_checked_at * 1000).toLocaleString()}</span>
                    </div>
                    {/* Status Detail (user-friendly) */}
                    {server.status !== 'running' && (
                      <div className="text-xs text-zinc-600 mt-1" title={server.status}>
                        <span className="font-semibold">Status Detail:</span> {server.status_detail}
                      </div>
                    )}
                  </div>
                  {/* Action Buttons Vertical */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      className="px-3 py-1 rounded bg-zinc-200 hover:bg-primary/20 text-zinc-700 border border-zinc-300 text-xs font-semibold transition"
                      title="Refresh agent status"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const data = await refreshAgent(server.agent_name);
                          if (data.agent) {
                            setServers(prev => prev.map(s => (s.agent_name === data.agent.agent_name && s.port === data.agent.port ? {
                              ...data.agent,
                              status_detail: data.agent.status_detail || data.agent.status // ensure type safety
                            } : s)));
                          }
                        } catch (err) {
                          // Optionally show error
                        }
                      }}
                    >
                      Refresh
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-red-100 hover:bg-red-200 text-red-600 border border-zinc-300 text-xs font-semibold transition"
                      title="Delete agent"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete agent '${server.agent_name}'?`)) {
                          try {
                            await deleteAgent(server.agent_name);
                            const data = await fetchAgentServers();
                            setServers(data.agents || []);
                          } catch (err: any) {
                            setError(err.message || 'Failed to delete agent');
                          }
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-textSecondary text-sm">No running servers found.</div>
          )}
        </div>
      )}

      {/* Add Agent Modal */}
      {addAgentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-card p-6 min-w-[420px] max-w-xl w-full relative">
            <button onClick={() => {
              // Clear all form fields when closing the form
              clearAgentForm();
              setAddAgentOpen(false);
            }} className="absolute top-2 right-2 text-xl">✕</button>
            <h2 className="text-xl font-bold mb-4">Add Agent</h2>
            <h3 className="text-lg font-semibold mb-2 mt-2 border-b pb-1">Agent Details</h3>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Agent Name</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Enter agent name" />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Agent Description</label>
              <textarea className="w-full border rounded px-3 py-2" value={newAgentDescription} onChange={e => setNewAgentDescription(e.target.value)} placeholder="Enter agent description" rows={2} />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Prompt</label>
              <textarea className="w-full border rounded px-3 py-2" value={newAgentPrompt} onChange={e => setNewAgentPrompt(e.target.value)} placeholder="Enter agent prompt" rows={3} />
            </div>
            <h3 className="text-lg font-semibold mb-2 mt-4 border-b pb-1">MCP Configuration</h3>
            <div className="mb-3">
              <label className="block mb-1 font-medium">MCP Address</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={newAgentMCP} onChange={e => setNewAgentMCP(e.target.value)} placeholder="Enter MCP address (e.g. http://host:port)" />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium" htmlFor="mcp-transport-type">MCP Transport Type</label>
              <select id="mcp-transport-type" className="w-full border rounded px-3 py-2" value={newAgentMCPTransport} onChange={e => setNewAgentMCPTransport(e.target.value)} aria-label="MCP Transport Type">
                <option value="streamable_http">streamable_http</option>
              </select>
            </div>
            {addAgentError && <div className="text-red-500 text-sm mb-2">{addAgentError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-accent px-4 py-2" onClick={() => {
                // Clear all form fields when canceling
                clearAgentForm();
                setAddAgentOpen(false);
              }}>Cancel</button>
              <button className="btn-primary px-4 py-2" onClick={handleAddAgent}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Details Popup */}
      <AgentDetailsPopup open={detailsPopupOpen} onClose={() => setDetailsPopupOpen(false)} agent={selectedAgent} />
    </div>
  );
};

export default EngineView;
