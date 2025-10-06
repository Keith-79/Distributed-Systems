import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatAPI } from '../api/chatapi';

export const fetchConversations = createAsyncThunk('chat/fetchConversations', async (userId) => {
  return await chatAPI.getConversations(userId);
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (conversationId) => {
  return await chatAPI.getMessages(conversationId);
});

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ userId, message, conversationId, title }) => {
    const res = await chatAPI.sendMessage(userId, message, conversationId, title);
    const messages = await chatAPI.getMessages(res.conversation_id);
    return { conversationId: res.conversation_id, messages: messages.messages };
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    userId: 1,
    conversations: [],
    messages: [],
    currentConversationId: null,
    loading: false,
    sending: false,
    error: null
  },
  reducers: {
    setCurrentConversation: (state, action) => {
      state.currentConversationId = action.payload;
      state.messages = [];
    },
    clearMessages: (state) => {
      state.currentConversationId = null;
      state.messages = [];
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages;
      })
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        state.currentConversationId = action.payload.conversationId;
        state.messages = action.payload.messages;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.error.message;
      });
  }
});

export const { setCurrentConversation, clearMessages, clearError } = chatSlice.actions;
export default chatSlice.reducer;
