import axios from 'axios';

const api = axios.create({
  // Sử dụng proxy cấu hình trong Vite nên không cần base URL full
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const aiService = {
  getConfig: async () => {
    const res = await api.get('/health');
    return res.data;
  },

  getSuggestions: async () => {
    const res = await api.get('/suggestions');
    return res.data;
  },
  
  getHistory: async () => {
    const res = await api.get('/history');
    return res.data;
  },

  getMessages: async (conversationId) => {
    const res = await api.get(`/conversations/${conversationId}/messages`);
    return res.data;
  },

  executeCode: async (payload) => {
    const res = await api.post('/execute', payload);
    return res.data;
  }
};

export default api;
