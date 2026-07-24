import React, { useEffect, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';

const ChatPanel = ({ chat, isFullScreen, onToggleFullScreen, onCloseChat }) => {
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
        <div style={{ display: 'flex', gap: '8px' }}>
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
          {!isFullScreen && (
            <button 
              className="icon-button" 
              onClick={onCloseChat}
              title="Đóng AI Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
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
