import React from 'react';

interface AgentSkillProps {
  skill: {
    id: string;
    name: string;
    description?: string;
  };
}

const AgentSkill: React.FC<AgentSkillProps> = ({ skill }) => {
  return (
    <div className="agent-skill-card">
      <div className="agent-skill-avatar">{skill.name[0]}</div>
      <div className="flex-1">
        <div className="agent-skill-title">{skill.name}</div>
        <div className="agent-skill-desc">{skill.description}</div>
      </div>
    </div>
  );
};

export default AgentSkill;
