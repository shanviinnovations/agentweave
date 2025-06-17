import React from 'react';
import { fetchAgentCard, checkDiscoveryHealth } from './agentApi';
import ChatWindow from './ChatWindow';

interface AgentsViewProps {
  chatOpen: boolean;
  onChatOpen: () => void;
  onCloseChat: () => void;
}

interface AgentCard {
  name: string;
  description?: string;
  url: string;
  version: string;
  skills: { id: string; name: string; description?: string }[];
}

const AgentsView: React.FC<AgentsViewProps> = ({ chatOpen, onChatOpen, onCloseChat }) => {
  const [activeAgent, setActiveAgent] = React.useState<number | null>(null);
  const [agentCards, setAgentCards] = React.useState<AgentCard[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [serverRunning, setServerRunning] = React.useState(true);
  const [chatAgent, setChatAgent] = React.useState<{ name: string; card: AgentCard } | null>(null);

  React.useEffect(() => {
    setLoading(true);
    checkDiscoveryHealth()
      .then((healthData) => {
        console.log('[AgentsView] checkDiscoveryHealth success:', healthData);
        fetchAgentCard()
          .then((data) => {
            console.log('[AgentsView] fetchAgentCard success:', data);
            // data.cards is array of cards
            setAgentCards(data.cards || []);
            setError(null);
            setServerRunning(true);
          })
          .catch((err) => {
            setError(''); // Don't show error, just show not running view
            setAgentCards([]);
            setServerRunning(false);
            console.error('[AgentsView] fetchAgentCard error:', err);
          })
          .finally(() => setLoading(false));
      })
      .catch((err) => {
        setError('');
        setAgentCards([]);
        setServerRunning(false);
        setLoading(false);
        console.error('[AgentsView] checkDiscoveryHealth error:', err);
      });
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {serverRunning ? (
        <div className="h-full w-full flex flex-col">
          {/* Agent cards */}
          {!chatOpen ? (
            loading ? (
              <div className="text-center text-zinc-400">Loading agent...</div>
            ) : error ? (
              <div className="text-center text-red-400">{error}</div>
            ) : agentCards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                {agentCards.map((agentCard, idx) => (
                  <div className="agent-card" key={agentCard.name + idx}>
                    <div className="agent-avatar">
                      <span className="agent-avatar-label">{agentCard.name[0]}</span>
                    </div>
                    <div className="agent-title">{agentCard.name}</div>
                    <div className="agent-desc">{agentCard.description}</div>
                    {/* Agent skills sub-cards */}
                    <div className="w-full grid grid-cols-1 gap-3 mb-4">
                      {agentCard.skills.map((skill) => (
                        <div key={skill.id} className="agent-skill-card">
                          <div className="agent-skill-avatar">{skill.name[0]}</div>
                          <div className="flex-1">
                            <div className="agent-skill-title">{skill.name}</div>
                            <div className="agent-skill-desc">{skill.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="btn-primary w-full" onClick={() => {
                      setActiveAgent(idx);
                      setChatAgent({ name: agentCard.name, card: agentCard });
                      onChatOpen();
                    }}>
                      Interact
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-textSecondary">No agent available.</div>
            )
          ) : (
            <ChatWindow
              onClose={onCloseChat}
              agentName={chatAgent?.name}
              agentCard={chatAgent?.card}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center h-full">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-4">Engine Not Running</div>
            <div className="text-lg text-textSecondary mb-2">Please start the engine to interact with agents.</div>
            <div className="text-textSecondary">Once the engine is running, you can view and interact with available agents here.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsView;
