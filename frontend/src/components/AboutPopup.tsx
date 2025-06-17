import React from 'react';

interface AboutPopupProps {
  open: boolean;
  onClose: () => void;
}

function AboutPopup({ open, onClose }: AboutPopupProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="about-popup-bg rounded-xl shadow-card p-6 min-w-[520px] max-w-xl w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 about-popup-close">✕</button>
        <h2 className="about-popup-title mb-3">About AgentWeave</h2>
        <div className="about-popup-text text-sm leading-relaxed">
          <p><b>AgentWeave</b> is an easy-to-use tool for creating A2A (Agent-to-Agent) clients and servers with integrated MCP (Model Context Protocol) and LangGraph support, featuring JWT authentication.</p>
          <p className="mt-2 text-xs"><b>Note:</b> This is an ongoing project. Multi-agent communication features are planned and will be available soon.</p>
          <ul className="list-disc pl-5 mt-2 text-xs">
            <li><b>MCP Tool Registration:</b> Easily register your MCP tool and spin up an A2A server agent.</li>
            <li><b>MCP Server Integration:</b> Agents seamlessly connect and interact with an MCP server.</li>
            <li><b>Query Processing:</b> Agents process user queries and return results efficiently.</li>
            <li><b>Dynamic Agent Creation:</b> Instantly create agents on the fly, connect them to the server, and start chatting.</li>
          </ul>
          <p className="mt-3">Developed and powered by <span className="text-primary font-bold">Shanvi Innovations</span>.</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPopup;
