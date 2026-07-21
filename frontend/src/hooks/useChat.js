import { useState, useCallback, useRef } from 'react';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMsgId, isStreaming: true }]);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          history: [] // We now rely on DB history if conversationId is provided
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') {
              setIsLoading(false);
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'error') {
                if (data.code === 400) {
                  setError(data.message);
                } else {
                  setError(data.message || 'Lỗi hệ thống');
                }
                setIsLoading(false);
                return;
              } else if (data.type === 'chunk') {
                assistantContent += data.text;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantContent } : m));
              } else if (data.type === 'done') {
                // Final parsed response
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { 
                  ...m, 
                  content: data.response.message,
                  code: data.response.code,
                  explanation: data.response.explanation,
                  suggestions: data.response.suggestions,
                  action: data.response.action,
                  conversation_id: data.response.conversation_id,
                  request_id: data.response.request_id,
                  isStreaming: false
                } : m));
                
                if (!conversationId && data.response.conversation_id) {
                  setConversationId(data.response.conversation_id);
                }
              }
            } catch (e) {
              console.error("Error parsing SSE JSON", e, dataStr);
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const loadConversation = useCallback(async (id, msgs) => {
    setConversationId(id);
    setMessages(msgs.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      code: m.code,
      explanation: m.explanation,
      suggestions: m.suggestions,
      action: m.action,
      conversation_id: id,
      request_id: m.request_id
    })));
    setError(null);
  }, []);

  const resetChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadConversation,
    resetChat,
    conversationId
  };
};
