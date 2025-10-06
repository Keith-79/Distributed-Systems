import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConversations, setCurrentConversation, clearMessages } from '../store/chatSlice';

const ConversationList = () => {
  const dispatch = useDispatch();
  const { conversations, currentConversationId, userId } = useSelector((state) => state.chat);

  useEffect(() => {
    dispatch(fetchConversations(userId));
  }, [dispatch, userId]);

  const handleConversationClick = (conversationId) => {
    dispatch(setCurrentConversation(conversationId));
  };

  const handleNewChat = () => {
    dispatch(clearMessages());
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="sidebar">
      <h2>💬 Conversations</h2>
      <button className="new-chat-btn" onClick={handleNewChat}>
        + New Chat
      </button>
      <ul className="conversation-list">
        {conversations.map((conv) => (
          <li
            key={conv.id}
            className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
            onClick={() => handleConversationClick(conv.id)}
          >
            <div className="conversation-title">{conv.title}</div>
            <div className="conversation-date">{formatDate(conv.updated_at)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ConversationList;
