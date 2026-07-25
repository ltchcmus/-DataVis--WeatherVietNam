import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel/ChatPanel';
import { aiService } from '../../services/api';
import { useChat } from '../../hooks/useChat';

const AIAssistantPage = ({ isFullScreen, onToggleFullScreen, onCloseChat }) => {
  const [historyList, setHistoryList] = useState([]);
  const chat = useChat();

  const fetchHistory = async () => {
    try {
      const data = await aiService.getHistory();
      setHistoryList(data);
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [chat.conversationId]);

  const handleSelectConversation = async (id) => {
    try {
      const msgs = await aiService.getMessages(id);
      chat.loadConversation(id, msgs);
    } catch (e) {
      console.error("Failed to load conversation", e);
    }
  };

  const handleNewChat = () => {
    chat.resetChat();
    fetchHistory(); // refresh history just in case
  };

  return (
    <div className="ai-assistant-container" style={{ display: 'flex', width: '100%', height: '100%' }}>
      {isFullScreen && (
        <Sidebar 
          history={historyList} 
          currentId={chat.conversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
        />
      )}
      <ChatPanel 
        chat={chat} 
        isFullScreen={isFullScreen} 
        onToggleFullScreen={onToggleFullScreen}
        onCloseChat={onCloseChat}
      />
    </div>
  );
};

export default AIAssistantPage;
