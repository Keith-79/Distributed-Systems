import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../lib/api";

/* -------------------- thunks -------------------- */
export const fetchBooks = createAsyncThunk(
  "books/fetchBooks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/books", { params });
      return res.data; // { data: [...], meta: {...} }
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Fetch failed" });
    }
  }
);

export const createBook = createAsyncThunk(
  "books/createBook",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/books", payload);
      return res.data; // BookOut
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Create failed" });
    }
  }
);

export const updateBook = createAsyncThunk(
  "books/updateBook",
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/books/${id}`, changes);
      return res.data; // BookOut
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Update failed" });
    }
  }
);

export const deleteBook = createAsyncThunk(
  "books/deleteBook",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/books/${id}`); // 204
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || { detail: "Delete failed" });
    }
  }
);

/* -------------------- slice -------------------- */
const booksSlice = createSlice({
  name: "books",
  initialState: {
    items: [],
    meta: { limit: 50, offset: 0, total: 0 },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchBooks.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchBooks.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload.data || [];
        s.meta = a.payload.meta || s.meta;
      })
      .addCase(fetchBooks.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload || a.error;
      })

      // create
      .addCase(createBook.pending, (s) => {
        s.error = null;
      })
      .addCase(createBook.fulfilled, (s, a) => {
        s.items.push(a.payload);
        s.meta.total = (s.meta.total || 0) + 1;
      })
      .addCase(createBook.rejected, (s, a) => {
        s.error = a.payload || a.error;
      })

      // update
      .addCase(updateBook.fulfilled, (s, a) => {
        const idx = s.items.findIndex((b) => b.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload; // mutate OK with Immer
      })
      .addCase(updateBook.rejected, (s, a) => {
        s.error = a.payload || a.error;
      })

      // delete
      .addCase(deleteBook.fulfilled, (s, a) => {
        const id = a.payload;
        s.items = s.items.filter((b) => b.id !== id); // replace array (no draft return)
        s.meta.total = Math.max(0, (s.meta.total || 0) - 1);
      })
      .addCase(deleteBook.rejected, (s, a) => {
        s.error = a.payload || a.error;
      });
  },
});

export default booksSlice.reducer;
