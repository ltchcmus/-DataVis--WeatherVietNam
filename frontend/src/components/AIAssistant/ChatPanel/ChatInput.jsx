import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const ChatInput = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-box">
      <textarea
        ref={textareaRef}
        className="chat-input"
        placeholder="Nhập yêu cầu để phân tích hoặc sinh mã..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
      />
      <button 
        className="send-btn" 
        onClick={handleSend} 
        disabled={disabled || !text.trim()}
      >
        <Send size={18} />
      </button>
    </div>
  );
};

export default ChatInput;
