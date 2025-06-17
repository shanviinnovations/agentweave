import React from 'react';
import AgentSkill from './AgentSkill';
import { AgentCardType } from '../../types/agentTypes';

interface AgentCardProps {
  agentCard: AgentCardType;
  onInteract: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agentCard, onInteract }) => {
  return (
    <div className="agent-card">
      {/* Agent Header */}
      <div className="agent-card-header">
        <div 
          className="agent-avatar" 
          aria-label={`${agentCard.name} icon`}
          tabIndex={0} 
          role="img"
        >
          <span className="agent-avatar-label" aria-hidden="true">
            {agentCard.name && agentCard.name.length > 0 ? agentCard.name[0].toUpperCase() : 'A'}
          </span>
        </div>
        <div className="agent-header-content">
          <div className="agent-title">{agentCard.name}</div>
          <div className="agent-version">v{agentCard.version}</div>
        </div>
      </div>

      {/* Agent Description */}
      <div className="agent-desc-container">
        <div className="agent-desc">{agentCard.description}</div>
      </div>

      {/* Agent skills sub-cards */}
      <div className="w-full grid grid-cols-1 gap-3 mb-4 mt-3">
        <h3 className="skills-header">Skills</h3>
        {agentCard.skills.map((skill) => (
          <AgentSkill key={skill.id} skill={skill} />
        ))}
      </div>

      {/* Interaction button */}
      <div className="agent-card-footer">
        <button className="btn-primary w-full" onClick={onInteract}>
          Interact
        </button>
      </div>
    </div>
  );
};

export default AgentCard;
