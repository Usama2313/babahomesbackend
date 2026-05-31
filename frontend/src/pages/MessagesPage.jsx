import { useState, useEffect } from "react";
import { MessageSquare, User, ArrowLeft, Phone, Shield, Mail, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../api";
import ChatWindow from "../components/ChatWindow";
import toast from "react-hot-toast";

const MessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminSearchResults, setAdminSearchResults] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawPropertyId = searchParams.get("propertyId");
  const rawOwnerId = searchParams.get("ownerId");
  const propertyId = (rawPropertyId === "null" || rawPropertyId === "undefined") ? null : rawPropertyId;
  const ownerId = (rawOwnerId === "null" || rawOwnerId === "undefined") ? null : rawOwnerId;
  const propertyTitle = searchParams.get("propertyTitle");
  const ownerName = searchParams.get("ownerName");

  const [activeConversation, setActiveConversation] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("babaUser") || "{}");
  const isAdmin = currentUser.role === "Admin" || currentUser.role === "Company";


  useEffect(() => {
    fetchConversations();
    // Poll for new conversations or updates to lastMessage
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [ownerId, propertyId]);

  const fetchConversations = async () => {
    try {
      const res = await API.get("/chat/conversations");
      setConversations(res.data);

      const cleanId = (id) => (id === "null" || id === "undefined" || id === "" || id === null) ? null : id;
      const pId = cleanId(propertyId);
      const oId = cleanId(ownerId);

      if (pId) {
        const existing = res.data.find(c => String(c.property?.id) === String(pId) && (String(c.sender?.id) === String(currentUser.id) || String(c.receiver?.id) === String(currentUser.id)));
        if (existing) {
          setActiveConversation(existing);
        } else if (oId) {
          const titleParam = searchParams.get("propertyTitle");
          const nameParam = searchParams.get("ownerName");

          // Auto-redirect if owner is a seller
          let finalOwnerId = oId;
          let finalOwnerName = nameParam || "User";

          try {
            const userRes = await API.get(`/auth/user/${oId}`);
            if (userRes.data.role === 'Property Seller') {
              const compRes = await API.get("/auth/company-user");
              if (compRes.data && compRes.data.id) {
                finalOwnerId = compRes.data.id;
                finalOwnerName = compRes.data.name;
              }
            }
          } catch (e) { console.error("Redirection check failed", e); }

          const newConv = {
            property: { id: pId, title: titleParam || "New Inquiry" },
            sender: currentUser,
            receiver: { id: finalOwnerId, name: finalOwnerName, role: "Property Owner" },
            isNew: true
          };
          setActiveConversation(newConv);
          setConversations([newConv, ...res.data]);
        }
      }
    } catch (err) {
      console.error("Error fetching conversations", err);
    } finally {
      setLoading(false);
    }
  };

  const getOtherUser = (conv) => {
    if (!conv) return {};
    const currId = String(currentUser.id);
    if (String(conv.sender?.id) === currId) return conv.receiver;
    if (String(conv.receiver?.id) === currId) return conv.sender;
    return conv.sender; // Spectating mode
  };

  const deleteConversation = async (e, conv) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this entire conversation? This cannot be undone.")) return;

    try {
      await API.delete(`/chat/conversation/${conv.property?.id || "null"}/${conv.sender?.id}/${conv.receiver?.id}`);
      toast.success("Conversation deleted");
      setConversations(prev => prev.filter(c => c !== conv));
      if (activeConversation === conv) setActiveConversation(null);
    } catch (err) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleMessageSent = (newMessage) => {
    setConversations(prev => prev.map(conv => {
      if (conv.property?.id === activeConversation?.property?.id &&
        conv.sender?.id === activeConversation?.sender?.id &&
        conv.receiver?.id === activeConversation?.receiver?.id) {
        return { ...conv, lastMessage: newMessage };
      }
      return conv;
    }));
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setAdminSearchResults([]);
      return;
    }

    if (isAdmin) {
      const delay = setTimeout(async () => {
        try {
          const res = await API.get(`/auth/admin/users/search?q=${searchQuery}`);
          setAdminSearchResults(res.data);
        } catch (err) { console.error("Search error", err); }
      }, 500);
      return () => clearTimeout(delay);
    }
  }, [searchQuery, isAdmin]);

  const displayedConversations = conversations.filter(conv => {
    if (searchQuery.trim() === "" || (isAdmin && adminSearchResults.length > 0)) return true;
    const other = getOtherUser(conv);
    const q = searchQuery.toLowerCase();
    return (
      other?.name?.toLowerCase().includes(q) ||
      other?.email?.toLowerCase().includes(q) ||
      other?.phone?.toLowerCase().includes(q) ||
      conv.property?.title?.toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="pageMessage">Loading messages...</div>;

  return (
    <div className="messages-layout-premium">
      <div className={`conversations-pane ${activeConversation ? 'hidden-mobile' : ''}`}>
        <div className="messages-header">
          <h1>{isAdmin ? "Global Chat Audit" : "My Messages"}</h1>
          <p>{isAdmin ? "Monitoring all platform communications" : "Manage your property inquiries"}</p>
          <input
            type="text"
            placeholder={isAdmin ? "Search users by name, email, or phone..." : "Search conversations..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="messages-search-input"
            style={{ width: "100%", padding: "10px 15px", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "15px", outline: "none" }}
          />
        </div>

        <div className="conversations-list">
          {isAdmin && adminSearchResults.length > 0 && (
            <div className="admin-search-results" style={{ padding: "10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <h4 style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Database Search Results</h4>
              {adminSearchResults.map(u => {
                const existing = conversations.find(c => c.receiver?.id === u.id || c.sender?.id === u.id);
                const handleClick = () => {
                  setSearchQuery("");
                  if (existing) {
                    setActiveConversation(existing);
                    setConversations(prev => {
                      const filtered = prev.filter(c => c !== existing);
                      return [existing, ...filtered];
                    });
                  } else {
                    const newConv = {
                      property: { id: null, title: "Direct Chat" },
                      sender: currentUser,
                      receiver: u,
                      isNew: true
                    };
                    setActiveConversation(newConv);
                    setConversations(prev => [newConv, ...prev]);
                  }
                };
                return (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "#fff", borderRadius: "6px", marginBottom: "4px", cursor: "pointer", border: "1px solid #e2e8f0" }} onClick={handleClick}>
                    <div>
                      <strong style={{ fontSize: "13px", display: "block" }}>{u.name}</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{u.email} | {u.phone}</span>
                    </div>
                    <span className="role-tag">{u.role}</span>
                  </div>
                );
              })}
            </div>
          )}

          {displayedConversations.length === 0 && (!propertyId || propertyId === "null") ? (
            <div className="no-conversations">
              <MessageSquare size={48} />
              <h2>No messages yet</h2>
              <button onClick={() => navigate("/")}>Browse Properties</button>
            </div>
          ) : (
            displayedConversations.map((conv, idx) => {
              const other = getOtherUser(conv);
              const isOtherOnline = other?.lastLogin && (new Date() - new Date(other.lastLogin)) < 5 * 60 * 1000;
              
              const isActive = (activeConversation?.property?.id || "null") === (conv.property?.id || "null") &&
                ((activeConversation?.sender?.id === conv.sender?.id && activeConversation?.receiver?.id === conv.receiver?.id) ||
                 (activeConversation?.sender?.id === conv.receiver?.id && activeConversation?.receiver?.id === conv.sender?.id));

              return (
                <div
                  key={idx}
                  className={`conversation-card ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveConversation(conv)}
                >
                  <div className="conv-avatar">
                    <div className="avatar-placeholder chat-avatar-wrapper">
                      {isAdmin ? <Shield size={20} color="#ffd400" /> : <User size={20} />}
                      {!isAdmin && <span className={`online-indicator-dot ${isOtherOnline ? 'online' : 'offline'}`}></span>}
                    </div>
                  </div>
                  <div className="conv-details">
                    <div className="conv-top">
                      <h3>{isAdmin ? `${conv.sender?.name} → ${conv.receiver?.name}` : other?.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="conv-date">{conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleDateString() : ''}</span>
                        {isAdmin && (
                          <button
                            onClick={(e) => deleteConversation(e, conv)}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                            title="Delete Conversation"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="conv-property">{conv.property?.title || 'Direct Chat'}</p>
                    {isAdmin && (
                      <div className="admin-meta-container" style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                        <div className="admin-meta-info">
                          <strong style={{ fontSize: "10px", color: "#334155" }}>{conv.sender?.name}:</strong>
                          <span><Phone size={10} /> {conv.sender?.phone}</span>
                          {conv.sender?.email && <span><Mail size={10} /> {conv.sender.email}</span>}
                          <span className="role-tag">{conv.sender?.role}</span>
                        </div>
                        <div className="admin-meta-info">
                          <strong style={{ fontSize: "10px", color: "#334155" }}>{conv.receiver?.name}:</strong>
                          <span><Phone size={10} /> {conv.receiver?.phone}</span>
                          {conv.receiver?.email && <span><Mail size={10} /> {conv.receiver.email}</span>}
                          <span className="role-tag">{conv.receiver?.role}</span>
                        </div>
                      </div>
                    )}
                    <p className="conv-last-msg">{conv.lastMessage?.content || 'New inquiry...'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={`chat-pane ${!activeConversation ? 'hidden-mobile' : ''}`}>
        {activeConversation ? (
          <div className="active-chat-wrapper">
            <div className="chat-nav-overlay" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "15px", borderBottom: "1px solid #e2e8f0" }}>
              <button className="back-to-list" onClick={() => setActiveConversation(null)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                <ArrowLeft size={18} /> Back
              </button>

              {!isAdmin && (
                <div className="chat-partner-info" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="partner-avatar-small" style={{ width: "30px", height: "30px", background: "#e2e8f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyCenter: "center" }}>
                    <User size={16} color="#64748b" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>{getOtherUser(activeConversation)?.name}</span>
                      {getOtherUser(activeConversation)?.lastLogin && (new Date() - new Date(getOtherUser(activeConversation).lastLogin)) < 5 * 60 * 1000 && (
                        <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>● Online</span>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{activeConversation?.property?.title || "Direct Chat"}</span>
                  </div>
                </div>
              )}

              {isAdmin && activeConversation && (
                <div className="admin-chat-header" style={{ marginLeft: "10px" }}>
                  <strong style={{ color: "#0f172a" }}>Audit Mode:</strong> {activeConversation.sender?.name} → {activeConversation.receiver?.name}
                </div>
              )}
            </div>
            {activeConversation && (
              <ChatWindow
                propertyId={activeConversation.property?.id}
                propertyTitle={activeConversation.property?.title}
                ownerId={getOtherUser(activeConversation)?.id}
                ownerName={getOtherUser(activeConversation)?.name}
                spectatorId={null}
                isFullPage={true}
                onMessageSent={handleMessageSent}
              />
            )}
          </div>
        ) : (
          <div className="chat-placeholder">
            <div className="placeholder-content">
              <MessageSquare size={64} opacity={0.2} />
              <p>Select a conversation to {isAdmin ? 'audit' : 'view messages'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
