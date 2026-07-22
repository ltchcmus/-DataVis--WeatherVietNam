import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { aiService } from '../../../services/api';

const ChatInput = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [maxImages, setMaxImages] = useState(4);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    aiService.getConfig().then(data => {
      if (data && data.max_image_uploads) {
        setMaxImages(data.max_image_uploads);
      }
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      alert(`Bạn chỉ có thể tải lên tối đa ${maxImages} ảnh.`);
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = event.target.result;
        setImages(prev => [...prev, base64Str]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if ((text.trim() || images.length > 0) && !disabled) {
      onSend(text, images);
      setText('');
      setImages([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      alert(`Bạn chỉ có thể tải lên tối đa ${maxImages} ảnh.`);
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = event.target.result;
        setImages(prev => [...prev, base64Str]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-wrapper" style={{ position: 'relative', width: '100%', margin: '0 auto', maxWidth: '800px', display: 'flex', flexDirection: 'column' }}>
      {images.length > 0 && (
        <div className="image-previews" style={{ display: 'flex', gap: '8px', padding: '8px', overflowX: 'auto' }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', minWidth: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <img src={img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                onClick={() => removeImage(idx)}
                style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="input-box" style={{ display: 'flex', alignItems: 'flex-end', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '1.5rem', padding: '0.5rem', paddingLeft: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
        <button 
          className="icon-button"
          style={{ padding: '0.5rem', color: 'var(--text-secondary)', marginRight: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || images.length >= maxImages}
          title="Tải ảnh lên"
        >
          <ImageIcon size={20} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          multiple 
          onChange={handleFileChange} 
        />
        
        <textarea
          ref={textareaRef}
          className="chat-input"
          style={{ flexGrow: 1, border: 'none', background: 'transparent', outline: 'none', resize: 'none', maxHeight: '200px', padding: '0.5rem 0', fontFamily: 'inherit', color: 'var(--text-primary)' }}
          placeholder="Nhập yêu cầu hoặc gửi/dán ảnh (Ctrl+V) để phân tích..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          rows={1}
        />
        
        <button 
          className="send-btn" 
          style={{ marginLeft: '0.5rem', padding: '0.6rem', borderRadius: '50%', background: (text.trim() || images.length > 0) && !disabled ? 'var(--accent-color)' : '#E2E8F0', color: (text.trim() || images.length > 0) && !disabled ? 'white' : 'var(--text-secondary)', border: 'none', cursor: (text.trim() || images.length > 0) && !disabled ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
          onClick={handleSend} 
          disabled={disabled || (!text.trim() && images.length === 0)}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
