import React from 'react';

const Sidebar = ({ history, currentId, onSelect, onNewChat }) => {
  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={onNewChat}>
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Đoạn chat mới
      </button>
      
      <div className="history-list">
        {history.map(conv => (
          <div 
            key={conv.id} 
            className={`history-item ${conv.id === currentId ? 'active' : ''}`}
            onClick={() => onSelect(conv.id)}
            title={conv.title || "Cuộc hội thoại"}
          >
            {conv.title || "Cuộc hội thoại"}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
