import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  setCurrentConversation,
} from "./chatSlice";

export default function Chat() {
  const dispatch = useDispatch();

  // pull chat slice safely with fallbacks
  const {
    conversations = [],
    activeId = null,
    messagesByConv = {},
    loading = false,
    error = null,
  } = useSelector((s) => s.chat) || {};

  const [text, setText] = useState("");

  // 1️⃣ Load conversations on mount
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  // 2️⃣ Load messages when active conversation changes
  useEffect(() => {
    if (activeId != null) {
      dispatch(fetchMessages(activeId));
    }
  }, [activeId, dispatch]);

  // 3️⃣ derived data
  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const messages = messagesByConv?.[activeId] ?? [];

  // 4️⃣ handlers
  const handleSelectConversation = (id) => {
    dispatch(setCurrentConversation(id));
    dispatch(fetchMessages(id));
  };

  const handleSend = () => {
    if (!text.trim() || !activeId) return;
    dispatch(sendMessage({ conversationId: activeId, text }));
    setText("");
  };

  // 5️⃣ render
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "250px",
          borderRight: "1px solid #ddd",
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        <h3>Conversations</h3>
        {loading && <p>Loading…</p>}
        {error && <p style={{ color: "crimson" }}>{JSON.stringify(error)}</p>}
        {conversations.length === 0 && !loading && <p>No conversations yet.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {conversations.map((c) => (
            <li
              key={c.id}
              onClick={() => handleSelectConversation(c.id)}
              style={{
                padding: "0.5rem",
                cursor: "pointer",
                backgroundColor: c.id === activeId ? "#eef" : "transparent",
                borderRadius: "6px",
              }}
            >
              {c.title || `Conversation ${c.id}`}
            </li>
          ))}
        </ul>
      </aside>

      {/* Main chat area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            padding: "1rem",
            borderBottom: "1px solid #ddd",
            background: "#f9f9f9",
          }}
        >
          <h2>
            {activeConversation
              ? activeConversation.title || `Conversation #${activeConversation.id}`
              : "Select a conversation"}
          </h2>
        </header>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            padding: "1rem",
            overflowY: "auto",
            background: "#fafafa",
          }}
        >
          {loading && <p>Loading messages…</p>}
          {!loading && messages.length === 0 && (
            <p style={{ color: "#555" }}>No messages in this conversation.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id || Math.random()}
              style={{
                marginBottom: "0.5rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                background:
                  m.role === "assistant" ? "#e3f2fd" : "#d1ffd6",
                alignSelf:
                  m.role === "assistant" ? "flex-start" : "flex-end",
                maxWidth: "75%",
              }}
            >
              <strong>{m.role}</strong>: {m.content}
            </div>
          ))}
        </div>

        {/* Input box */}
        <footer
          style={{
            display: "flex",
            borderTop: "1px solid #ddd",
            padding: "0.75rem",
            background: "#fff",
          }}
        >
          <input
            type="text"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex: 1,
              marginRight: "0.5rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || !activeId}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "6px",
              background: "#007bff",
              color: "white",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </footer>
      </main>
    </div>
  );
}
