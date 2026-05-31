import { useState, useEffect, useRef } from "react";
import { Send, User, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import toast from "react-hot-toast";

const ChatWindow = ({ propertyId, propertyTitle, ownerId, ownerName, isFullPage, onMessageSent, spectatorId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiverRole, setReceiverRole] = useState("");
  const [receiverLastLogin, setReceiverLastLogin] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [fallbackId, setFallbackId] = useState(null);
  const navigate = useNavigate();

  const scrollRef = useRef();
  const messagesContainerRef = useRef();
  const currentUser = JSON.parse(localStorage.getItem("babaUser") || "{}");
  const isAdmin = currentUser?.role === 'Admin';

  const fetchReceiverDetails = async () => {
    try {
      const cleanId = (id) => (id === "null" || id === "undefined" || id === "" || id === null) ? null : id;
      const oId = cleanId(ownerId);
      const pId = cleanId(propertyId);

      if (!oId) return;

      const res = await API.get(`/auth/user/${oId}`);
      setReceiverRole(res.data.role);
      setReceiverLastLogin(res.data.lastLogin);

      // If it's an Agent, check if they are "Available" (responded in last 1hr)
      if (res.data.role === 'Agent' && pId) {
        const availRes = await API.get(`/chat/check-availability/${pId}/${oId}`);
        if (!availRes.data.available) {
          setUnavailable(true);
          setFallbackId(availRes.data.fallback?.id);
        } else {
          setUnavailable(false);
        }
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (ownerId) {
      fetchReceiverDetails();
      const interval = setInterval(fetchReceiverDetails, 15000); // Check status every 15s
      return () => clearInterval(interval);
    }
  }, [ownerId, propertyId]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const cleanId = (id) => (id === "null" || id === "undefined" || id === "" || id === null) ? null : id;
        const oId = cleanId(ownerId);
        const pId = cleanId(propertyId) || "null"; // "null" string is handled by backend for propertyId

        if (!oId) return;

        const url = `/chat/conversation/${pId}/${oId}${spectatorId ? `?senderId=${spectatorId}` : ""}`;
        const res = await API.get(url);
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages", err);
      }
    };

    const cleanId = (id) => (id === "null" || id === "undefined" || id === "" || id === null) ? null : id;
    if (cleanId(ownerId)) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000); // Poll every 2s
      return () => clearInterval(interval);
    }
  }, [propertyId, ownerId, spectatorId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 20;
    if (isAtBottom) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const res = await API.post("/chat/send", {
        receiverId: ownerId,
        propertyId,
        content: newMessage
      });
      setMessages([...messages, res.data]);
      setNewMessage("");
      if (onMessageSent) {
        onMessageSent(res.data);
      }
      // After sending, refresh status
      fetchReceiverDetails();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to send message";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!ownerId) {
    return (
      <div className="chat-window">
        <p className="pageMessage">Loading chat...</p>
      </div>
    );
  }

  const displayTitle = receiverRole === 'Property Seller' ? 'Chat with Admin' :
    receiverRole === 'Agent' ? 'Chat with Agent' :
      `Chat with ${ownerName || 'User'}`;

  const isOnline = receiverLastLogin && (new Date() - new Date(receiverLastLogin)) < 5 * 60 * 1000;

  return (
    <div className={`chat-window ${isFullPage ? 'full-page' : ''}`}>
      <div className="chat-header">
        <div className="chat-owner-info">
          <div className="chat-avatar-wrapper">
            <User size={20} />
            <span className={`online-indicator-dot ${isOnline ? 'online' : 'offline'}`}></span>
          </div>
          <div className="chat-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>{displayTitle}</strong>
              {isOnline ? (
                <span style={{ color: '#10b981', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Online</span>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '500' }}>
                  {receiverLastLogin ? `Last seen ${new Date(receiverLastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}
                </span>
              )}
            </div>
            {propertyTitle && <span className="chat-property-title">Re: {propertyTitle}</span>}
          </div>
        </div>
      </div>

      {unavailable && fallbackId && !isAdmin && (
        <div className="chat-fallback-alert">
          <p>Agent hasn't responded in 1 hour. Please initiate a new conversation.</p>
          <button onClick={() => navigate(`/messages?propertyId=${propertyId || "null"}&ownerId=${fallbackId}&ownerName=Admin`)}>
            Chat with Admin
          </button>
        </div>
      )}

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="no-messages">
            <MessageSquare size={32} />
            <p>Start a conversation about this property</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSpectator = !!spectatorId;
            const isSent = !isSpectator ? String(msg.senderId) === String(currentUser.id) : false;
            return (
              <div
                key={msg.id}
                className={`message-bubble-wrapper ${isSent ? "sent" : "received"} ${isSpectator ? "spectator-view" : ""}`}
              >
                {!isSent && (
                  <div className="msg-avatar">
                    {msg.sender?.profilePicture ? (
                      <img src={msg.sender.profilePicture} alt={msg.sender?.name || "User"} />
                    ) : (
                      <div className="msg-avatar-placeholder"><User size={16} /></div>
                    )}
                  </div>
                )}
                <div className={`message-bubble ${isSent ? "sent" : "received"}`}>
                  {!isSent && (
                    <div className="msg-sender-name">{msg.sender?.name || "User"}</div>
                  )}
                  <div className="msg-content">{msg.content}</div>
                  <div className="msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      <form className="chat-input" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newMessage.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
