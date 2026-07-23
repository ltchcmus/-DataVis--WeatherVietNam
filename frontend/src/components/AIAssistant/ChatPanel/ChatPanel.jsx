import React, { useEffect, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';

const ChatPanel = ({ chat, isFullScreen, onToggleFullScreen }) => {
  const { messages, isLoading, error, sendMessage } = chat;
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-area">
      {/* Header for ChatPanel */}
      <div className="chat-header">
        <div className="chat-header-title">
          <span className="status-dot"></span>
          AI Assistant
        </div>
        <button 
          className={isFullScreen ? "btn-back-dashboard" : "icon-button"} 
          onClick={onToggleFullScreen}
          title={isFullScreen ? "Thu nhỏ màn hình" : "Phóng to màn hình"}
        >
          {isFullScreen ? (
            <>
              <Minimize size={16} />
              <span>Quay lại Dashboard</span>
            </>
          ) : (
            <Maximize size={18} />
          )}
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <h2>Vietnam Weather AI</h2>
            <p>Xin chào! Tôi có thể giúp bạn phân tích dữ liệu thời tiết Việt Nam hôm nay. Hãy hỏi tôi bất cứ điều gì.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id || idx} 
              message={msg} 
              onSuggestionClick={sendMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-area-container">
        <SuggestionChips onSelect={sendMessage} />
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default ChatPanel;
