import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

function App() {
  const [selected, setSelected] = useState(null as 'client' | 'server' | null);
  const [chatOpen, setChatOpen] = useState(false);

  // Close chat window if switching away from Agents tab
  useEffect(() => {
    if (selected !== 'client' && chatOpen) {
      setChatOpen(false);
    }
  }, [selected]);

  return (
    <div className="flex h-screen bg-background font-display">
      <Sidebar selected={selected} onSelect={setSelected} />
      <div className="flex-1 p-8">
        <MainContent
          selected={selected}
          chatOpen={chatOpen}
          onChatOpen={() => setChatOpen(true)}
          onCloseChat={() => setChatOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;