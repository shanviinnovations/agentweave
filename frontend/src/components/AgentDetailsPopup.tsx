import React from 'react';

interface AgentDetailsPopupProps {
  open: boolean;
  onClose: () => void;
  agent: {
    agent_name: string;
    agent_description: string;
    agent_prompt: string;
    mcp_address: string;
    mcp_transport_type: string;
    host: string;
    port: number;
    id: string;
    status: string;
    status_detail?: string;
    status_checked_at: number;
  } | null;
}

const AgentDetailsPopup: React.FC<AgentDetailsPopupProps> = ({ open, onClose, agent }) => {
  if (!open || !agent) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-card p-6 min-w-[420px] max-w-xl w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-xl">✕</button>
        <h2 className="text-xl font-bold mb-4">Agent Details</h2>
        <div className="mb-2"><b>Name:</b> {agent.agent_name}</div>
        <div className="mb-2">
          <b>Description:</b>
          <div className="agent-details-description bg-zinc-50 rounded p-2 text-sm border border-zinc-200 mt-1 whitespace-pre-line">
            {agent.agent_description}
          </div>
        </div>
        <div className="mb-2">
          <b>Prompt:</b>
          <div className="agent-details-prompt bg-zinc-50 rounded p-2 text-xs border border-zinc-200 mt-1 whitespace-pre-line">
            {agent.agent_prompt}
          </div>
        </div>
        <div className="mb-2"><b>MCP Address:</b> {agent.mcp_address}</div>
        <div className="mb-2"><b>MCP Transport Type:</b> {agent.mcp_transport_type}</div>
        <div className="mb-2"><b>Host:</b> {agent.host}</div>
        <div className="mb-2"><b>Port:</b> {agent.port}</div>
        <div className="mb-2"><b>Status:</b> <span className={`font-semibold px-2 py-1 rounded ${agent.status === 'running' ? 'bg-green-100 text-green-700' : agent.status === 'connection refused' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>{agent.status}</span></div>
        <div className="mb-2"><b>Status Detail:</b> <span className="text-xs text-zinc-600">{agent.status_detail || '-'}</span></div>
        <div className="mb-2"><b>Status Checked At:</b> {new Date(agent.status_checked_at * 1000).toLocaleString()}</div>
        <div className="mb-2"><b>ID:</b> {agent.id}</div>
      </div>
    </div>
  );
};

export default AgentDetailsPopup;
