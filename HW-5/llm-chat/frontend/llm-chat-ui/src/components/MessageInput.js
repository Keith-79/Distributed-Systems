import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendMessage } from '../store/chatSlice';

const MessageInput = () => {
  const [inputMessage, setInputMessage] = useState('');
  const dispatch = useDispatch();
  const { currentConversationId, userId, sending } = useSelector((state) => state.chat);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (inputMessage.trim() === '' || sending) return;

    const title = currentConversationId ? null : `Chat ${new Date().toLocaleDateString()}`;

    dispatch(sendMessage({
      userId,
      message: inputMessage,
      conversationId: currentConversationId,
      title
    }));

    setInputMessage('');
  };

  return (
    <div className="input-container">
      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="message-input"
          placeholder="Type your message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="send-btn" disabled={sending || inputMessage.trim() === ''}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
