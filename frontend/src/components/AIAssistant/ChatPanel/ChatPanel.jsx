import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';

const ChatPanel = ({ chat }) => {
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
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h2>AI Data Assistant</h2>
            <p>Xin chào! Tôi có thể giúp bạn phân tích dữ liệu thời tiết Việt Nam hôm nay.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={msg.id || idx} message={msg} />
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
