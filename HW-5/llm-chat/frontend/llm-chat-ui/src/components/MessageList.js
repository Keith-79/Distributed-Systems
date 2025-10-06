import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

const MessageList = () => {
  const { messages, loading, sending } = useSelector((state) => state.chat);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading">Loading messages...</div>;

  if (messages.length === 0 && !sending) {
    return (
      <div className="empty-state">
        <h2>👋 Start a conversation</h2>
        <p>Type a message below to begin chatting with the AI assistant</p>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {messages.map((message, index) => (
        <div key={index} className={`message ${message.role}`}>
          <div className="message-role">{message.role.toUpperCase()}</div>
          <div className="message-content">{message.content}</div>
          <div className="message-time">{formatTime(message.created_at)}</div>
        </div>
      ))}
      {sending && (
        <div className="message assistant">
          <div className="message-role">ASSISTANT</div>
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
