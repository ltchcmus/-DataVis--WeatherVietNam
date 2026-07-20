import React, { useState, useEffect } from 'react';
import { aiService } from '../../../services/api';

const SuggestionChips = ({ onSelect }) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await aiService.getSuggestions();
        setSuggestions(data);
      } catch (e) {
        console.error("Failed to fetch suggestions", e);
      }
    };
    fetchSuggestions();
  }, []);

  if (suggestions.length === 0) return null;

  return (
    <div className="suggestions-container">
      {suggestions.map((s, idx) => (
        <button 
          key={s.id || idx} 
          className="suggestion-chip"
          onClick={() => onSelect(s.prompt)}
          title={s.description}
        >
          {s.icon} {s.title}
        </button>
      ))}
    </div>
  );
};

export default SuggestionChips;
