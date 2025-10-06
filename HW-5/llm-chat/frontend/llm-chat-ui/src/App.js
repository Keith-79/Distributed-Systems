import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ConversationList from './components/ConversationList';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import { fetchMessages, clearError } from './store/chatSlice';
import './index.css';

function App() {
  const dispatch = useDispatch();
  const { currentConversationId, error } = useSelector((state) => state.chat);

  useEffect(() => {
    if (currentConversationId) dispatch(fetchMessages(currentConversationId));
  }, [currentConversationId, dispatch]);

  return (
    <div className="chat-container">
      <ConversationList />
      <div className="chat-main">
        <div className="chat-header">
          <h1>🤖 LLM Chat Assistant</h1>
        </div>
        {error && (
          <div className="error">
            Error: {error}
            <button onClick={() => dispatch(clearError())} style={{ marginLeft: '10px' }}>✕</button>
          </div>
        )}
        <MessageList />
        <MessageInput />
      </div>
    </div>
  );
}

export default App;
