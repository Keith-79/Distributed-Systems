import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const chatAPI = {
  sendMessage: async (userId, message, conversationId = null, title = null) => {
    const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
      user_id: userId,
      message,
      conversation_id: conversationId,
      title
    });
    return response.data;
  },

  getConversations: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/ai/conversations`, {
      params: { user_id: userId }
    });
    return response.data;
  },

  getMessages: async (conversationId) => {
    const response = await axios.get(`${API_BASE_URL}/ai/messages/${conversationId}`);
    return response.data;
  }
};
