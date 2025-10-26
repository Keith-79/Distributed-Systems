// src/store/store.js
import { configureStore } from "@reduxjs/toolkit";
import booksReducer from "../features/books/booksSlice";  // adjust if your path differs
import chatReducer  from "../features/chat/chatSlice";

export const store = configureStore({
  reducer: {
    books: booksReducer,
    chat: chatReducer,
  },
});
