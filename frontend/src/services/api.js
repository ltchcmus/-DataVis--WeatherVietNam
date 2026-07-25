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
    try {
      const res = await api.get('/health');
      return res.data;
    } catch {
      return { status: 'offline' };
    }
  },

  getSuggestions: async () => {
    try {
      const res = await api.get('/suggestions');
      return res.data;
    } catch {
      // Fallback suggestions khi chưa bật backend
      return [
        { id: 1, title: 'Tỉnh nào nóng nhất?', prompt: 'Tỉnh nào có nhiệt độ cao nhất?', icon: '🔥' },
        { id: 2, title: 'Khu vực mưa nhiều nhất', prompt: 'Những tỉnh nào có lượng mưa cao nhất?', icon: '🌧️' },
        { id: 3, title: 'Phân bố AQI', prompt: 'Chỉ số chất lượng không khí AQI phân bố thế nào?', icon: '🌫️' }
      ];
    }
  },
  
  getHistory: async () => {
    try {
      const res = await api.get('/history');
      return res.data;
    } catch {
      return [];
    }
  },

  getMessages: async (conversationId) => {
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`);
      return res.data;
    } catch {
      return [];
    }
  },

  executeCode: async (payload) => {
    const res = await api.post('/execute', payload);
    return res.data;
  }
};

export default api;
