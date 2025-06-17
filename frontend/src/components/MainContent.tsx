import React from 'react';
import AgentsView from './agent/AgentsView';
import EngineView from './EngineView';
import '../styles/agentCard.css';
import '../styles/agentCardThemes.css';

interface MainContentProps {
  selected: 'client' | 'server' | null;
  chatOpen: boolean;
  onChatOpen: () => void;
  onCloseChat: () => void;
}

function MainContent({ selected, chatOpen, onChatOpen, onCloseChat }: MainContentProps) {
  if (!selected) {
    return <div className="text-lg maincontent-fallback">Please select "Agents" or "Engine" from the sidebar.</div>;
  }
  if (selected === 'server') {
    return <EngineView />;
  }
  if (selected === 'client') {
    return <AgentsView chatOpen={chatOpen} onChatOpen={onChatOpen} onCloseChat={onCloseChat} />;
  }
  return null;
}

export default MainContent;