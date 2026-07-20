import React from 'react';
import CodeBlock from './CodeBlock';

// Hàm helper cực kỳ đơn giản để render markdown nhẹ nhàng
const renderFormattedText = (text) => {
  if (!text) return null;
  // Thay thế bold
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Thay thế newline
  html = html.replace(/\n/g, '<br/>');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-container">
        <div className={`avatar ${isUser ? 'user' : 'assistant'}`}>
          {isUser ? 'U' : 'AI'}
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
              {renderFormattedText(message.content)}
              
              {message.code && (
                <CodeBlock code={message.code} />
              )}
              
              {message.explanation && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.375rem' }}>
                  <h4>Giải thích code:</h4>
                  {renderFormattedText(message.explanation)}
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
