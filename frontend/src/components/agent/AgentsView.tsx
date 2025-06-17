import React from 'react';
import { fetchAgentCard, checkDiscoveryHealth } from '../agentApi';
import ChatWindow from '../ChatWindow';
import { AgentCardType } from '../../types/agentTypes';
import AgentCard from './AgentCard';
import AgentCardSkeleton from './AgentCardSkeleton';

interface AgentsViewProps {
  chatOpen: boolean;
  onChatOpen: () => void;
  onCloseChat: () => void;
}

const AgentsView: React.FC<AgentsViewProps> = ({ chatOpen, onChatOpen, onCloseChat }) => {
  const [activeAgent, setActiveAgent] = React.useState<number | null>(null);
  const [agentCards, setAgentCards] = React.useState<AgentCardType[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [serverRunning, setServerRunning] = React.useState(true);
  const [chatAgent, setChatAgent] = React.useState<{ name: string; card: AgentCardType } | null>(null);

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

  const handleInteract = (idx: number, agentCard: AgentCardType) => {
    setActiveAgent(idx);
    setChatAgent({ name: agentCard.name, card: agentCard });
    onChatOpen();
  };

  if (!serverRunning) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary mb-4">Engine Not Running</div>
          <div className="text-lg text-textSecondary mb-2">Please start the engine to interact with agents.</div>
          <div className="text-textSecondary">Once the engine is running, you can view and interact with available agents here.</div>
        </div>
      </div>
    );
  }

  // Show chat window when a chat is open
  if (chatOpen) {
    return (
      <ChatWindow
        onClose={onCloseChat}
        agentName={chatAgent?.name}
        agentCard={chatAgent?.card}
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="h-full w-full flex flex-col">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-400">{error}</div>
        ) : agentCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            {agentCards.map((agentCard, idx) => (
              <AgentCard
                key={`${agentCard.name}-${idx}`}
                agentCard={agentCard}
                onInteract={() => handleInteract(idx, agentCard)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-textSecondary">No agent available.</div>
        )}
      </div>
    </div>
  );
};

export default AgentsView;
