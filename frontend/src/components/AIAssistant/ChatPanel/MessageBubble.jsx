import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
import { User, Bot } from 'lucide-react';

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-container">
        <div className={`avatar ${isUser ? 'user' : 'assistant'}`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        <div className="message-content">
          {message.isStreaming && !message.content ? (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          ) : (
            <>
              {message.content && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              )}
              
              {message.code && (
                <CodeBlock 
                  initialCode={message.code} 
                  conversationId={message.conversation_id} 
                  requestId={message.request_id || message.id} 
                />
              )}
              
              {message.explanation && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '0.5rem', borderLeft: '4px solid var(--ai-accent-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--ai-text-secondary)', fontSize: '0.875rem' }}>Giải thích logic:</h4>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.explanation}
                  </ReactMarkdown>
                </div>
              )}
              
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="suggestions-list" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--ai-text-secondary)', fontSize: '0.875rem' }}>💡 Gợi ý phân tích cho bạn:</h4>
                  {message.suggestions.map((suggestion, idx) => (
                    <div key={idx} style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#334155', lineHeight: '1.4' }}>
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
