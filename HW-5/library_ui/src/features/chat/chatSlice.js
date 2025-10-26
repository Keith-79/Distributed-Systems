// src/features/chat/chatSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api"; // <-- note the path (features/chat -> lib)

// ---- thunks ----
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/conversations?limit=50&offset=0");
      // accept either {data:[...]} or raw list
      return res.data?.data ?? res.data ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Fetch conversations failed" });
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (conversationId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      // accept either {data:[...]} or raw list
      return { conversationId, messages: res.data?.data ?? res.data ?? [] };
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Fetch messages failed" });
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, text }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/messages`, {
        conversation_id: conversationId,
        content: text,
      });
      return { conversationId, message: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Send message failed" });
    }
  }
);

// ---- slice ----
const chatSlice = createSlice({
  name: "chat",
  initialState: {
    conversations: [],
    messagesByConv: {}, // { [conversationId]: [messages] }
    activeId: null,
    loading: false,
    error: null,
  },
  reducers: {
    setActiveConversation(state, action) {
      state.activeId = action.payload;
    },
    addMessage(state, action) {
      const { conversationId, message } = action.payload;
      const arr = state.messagesByConv[conversationId] ?? [];
      state.messagesByConv[conversationId] = [...arr, message];
    },
  },
  extraReducers: (builder) => {
    builder
      // conversations
      .addCase(fetchConversations.pending, (s) => {
        s.loading = true; s.error = null;
      })
      .addCase(fetchConversations.fulfilled, (s, a) => {
        s.loading = false;
        s.conversations = a.payload;
        if (s.activeId == null && s.conversations.length) {
          s.activeId = s.conversations[0].id;
        }
      })
      .addCase(fetchConversations.rejected, (s, a) => {
        s.loading = false; s.error = a.payload || a.error;
      })

      // messages
      .addCase(fetchMessages.pending, (s) => {
        s.error = null;
      })
      .addCase(fetchMessages.fulfilled, (s, a) => {
        const { conversationId, messages } = a.payload;
        s.messagesByConv[conversationId] = messages;
      })
      .addCase(fetchMessages.rejected, (s, a) => {
        s.error = a.payload || a.error;
      })

      // send
      .addCase(sendMessage.fulfilled, (s, a) => {
        const { conversationId, message } = a.payload;
        const arr = s.messagesByConv[conversationId] ?? [];
        s.messagesByConv[conversationId] = [...arr, message];
      })
      .addCase(sendMessage.rejected, (s, a) => {
        s.error = a.payload || a.error;
      });
  },
});

export const { setActiveConversation, addMessage } = chatSlice.actions;
// Back-compat alias so Chat.jsx can import it without changes:
export const setCurrentConversation = setActiveConversation;

export default chatSlice.reducer;
