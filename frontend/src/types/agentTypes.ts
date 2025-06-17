export interface AgentCardType {
  name: string;
  description?: string;
  url: string;
  version: string;
  skills: AgentSkillType[];
}

export interface AgentSkillType {
  id: string;
  name: string;
  description?: string;
}
