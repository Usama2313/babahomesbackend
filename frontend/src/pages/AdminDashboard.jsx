import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Home, Eye, Shield, Search, Trash2,
  UserCheck, AlertCircle, BarChart, TrendingUp,
  CheckCircle, XCircle, Star, Settings, MessageSquare,
  Building2, MapPin, Globe, Filter, MoreVertical, Mail, Phone,
  Menu, X, Key
} from "lucide-react";
import API from "../api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [filterRole, setFilterRole] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getTrialStatusText = (p) => {
    if (!p.isTrial) return 'Paid Plan';
    const now = new Date();
    const expiry = new Date(p.trialExpiresAt);
    if (expiry <= now) return 'Trial (Expired)';
    const diffTime = expiry - now;
    const diffDays = Math.min(15, Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
    return `Trial (${diffDays}d left)`;
  };

  const currentUser = JSON.parse(localStorage.getItem("babaUser") || "{}");

  useEffect(() => {
    if (!currentUser.role || (currentUser.role !== 'Admin' && currentUser.role !== 'Company')) {
      toast.error("Access denied");
      navigate("/");
      return;
    }
    fetchData();
  }, [activeTab]);

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "overview") {
        const res = await API.get("/auth/admin/stats");
        setStats(res.data);
      } else if (activeTab === "users") {
        const res = await API.get("/auth/admin/users");
        setUsers(res.data);
      } else if (activeTab === "properties") {
        const res = await API.get("/properties/admin/all");
        setProperties(res.data);
      }
    } catch (err) {
      console.error("Dashboard error", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = async (userId, data) => {
    try {
      await API.put(`/auth/admin/user/${userId}`, data);
      toast.success("User updated");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    } catch (err) {
      toast.error("Failed to update user");
    }
  };

  const handleResetPassword = async (userId) => {
    const newPass = window.prompt("Enter new password for this user:");
    if (!newPass) return;
    try {
      await API.put(`/auth/admin/user/${userId}`, { password: newPass });
      toast.success("Password updated successfully!");
      // Refetch to see the new hash
      fetchData();
    } catch (err) {
      toast.error("Failed to reset password");
    }
  };

  const handlePropertyUpdate = async (propId, data) => {
    try {
      await API.put(`/properties/admin/${propId}`, data);
      toast.success(`Property ${data.isHidden ? 'hidden' : 'shown'} successfully`);
      setProperties(prev => prev.map(p => p.id === propId ? { ...p, ...data } : p));
      // Update hidden property IDs in localStorage for MyProperties view
      if (typeof window !== 'undefined' && typeof window.updateHiddenProperty === 'function') {
        window.updateHiddenProperty(propId, data.isHidden);
      }
    } catch (err) {
      toast.error("Failed to update property");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      await API.delete(`/auth/admin/user/${userId}`);
      toast.success("User deleted");
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const deleteProperty = async (propId) => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    try {
      await API.delete(`/properties/admin/${propId}`);
      toast.success("Property deleted");
      setProperties(prev => prev.filter(p => p.id !== propId));
    } catch (err) {
      toast.error("Failed to delete property");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "All" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredProps = properties.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ownerDetails?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProps.length / itemsPerPage);
  const paginatedProps = filteredProps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  if (loading && !stats && activeTab === "overview") return <div className="pageMessage">Loading Dashboard...</div>;

  return (
    <div className={`admin-layout ${mobileSidebarOpen ? "sidebar-open" : ""}`}>
      {/* Mobile Top Header Menu Bar */}
      <div className="admin-mobile-bar">
        <div className="mobile-logo">
          <Shield size={20} />
          <span>Admin Portal</span>
        </div>
        <button className="mobile-menu-toggle" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
          {mobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {mobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <div className={`admin-sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        <div className="admin-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={24} />
            <span>Admin Portal</span>
          </div>
          <button className="sidebar-close-btn" onClick={() => setMobileSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav>
          <button className={activeTab === "overview" ? "active" : ""} onClick={() => { setActiveTab("overview"); setMobileSidebarOpen(false); }}>
            <BarChart size={20} /> Overview
          </button>
          <button className={activeTab === "users" ? "active" : ""} onClick={() => { setActiveTab("users"); setSearchQuery(""); setMobileSidebarOpen(false); }}>
            <Users size={20} /> Users
          </button>
          <button className={activeTab === "properties" ? "active" : ""} onClick={() => { setActiveTab("properties"); setSearchQuery(""); setMobileSidebarOpen(false); }}>
            <Home size={20} /> Properties
          </button>
          <button onClick={() => { window.location.href = "/messages"; setMobileSidebarOpen(false); }}>
            <MessageSquare size={20} /> Chat Audit
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="u-info">
            <div className="u-avatar">{currentUser.name?.charAt(0)}</div>
            <div>
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <p>
              {activeTab === "properties" && filteredProps.length > 0 && `Total of ${filteredProps.length} properties registered`}
              {activeTab === "users" && `Total of ${filteredUsers.length} users registered`}
              {activeTab === "overview" && "Platform management and oversight"}
            </p>
          </div>

          {(activeTab === "users" || activeTab === "properties") && (
            <div className="admin-controls">
              <div className="admin-search">
                <Search size={18} />
                <input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {activeTab === "users" && (
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="role-filter">
                  <option value="All">All Roles</option>
                  <option value="Property Finder">Finders</option>
                  <option value="Agent">Agents</option>
                  <option value="Property Seller">Sellers</option>
                  <option value="Company">Company</option>
                </select>
              )}
            </div>
          )}
        </header>

        {loading ? (
          <div className="admin-loader">
            <div className="loaderSpinner"></div>
            <p>Loading {activeTab} data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && stats && (
                <div className="admin-overview">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon users"><Users size={24} /></div>
                      <div className="stat-info">
                        <span>Total Users</span>
                        <h3>{stats.totalUsers}</h3>
                      </div>
                      <div className="stat-trend positive"><TrendingUp size={14} /> Active</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon properties"><Home size={24} /></div>
                      <div className="stat-info">
                        <span>Properties</span>
                        <h3>{stats.totalProperties}</h3>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon views"><Eye size={24} /></div>
                      <div className="stat-info">
                        <span>Total Views</span>
                        <h3>{stats.totalViews}</h3>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon agents"><UserCheck size={24} /></div>
                      <div className="stat-info">
                        <span>Verified Agents</span>
                        <h3>{stats.agents}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="admin-two-col">
                    <div className="role-distribution-card">
                      <h3>User Role Distribution</h3>
                      <div className="distribution-bars">
                        <div className="dist-item">
                          <span>Agents</span>
                          <div className="bar-bg"><div className="bar-fill" style={{ width: `${(stats.agents / stats.totalUsers) * 100}%`, background: '#3b82f6' }}></div></div>
                          <span className="dist-count">{stats.agents}</span>
                        </div>
                        <div className="dist-item">
                          <span>Sellers</span>
                          <div className="bar-bg"><div className="bar-fill" style={{ width: `${(stats.sellers / stats.totalUsers) * 100}%`, background: '#f59e0b' }}></div></div>
                          <span className="dist-count">{stats.sellers}</span>
                        </div>
                        <div className="dist-item">
                          <span>Finders</span>
                          <div className="bar-bg"><div className="bar-fill" style={{ width: `${((stats.totalUsers - stats.agents - stats.sellers) / stats.totalUsers) * 100}%`, background: '#10b981' }}></div></div>
                          <span className="dist-count">{stats.totalUsers - stats.agents - stats.sellers}</span>
                        </div>
                      </div>
                    </div>

                    <div className="recent-activity-card">
                      <h3>Quick Actions</h3>
                      <div className="quick-actions-grid">
                        <button onClick={() => setActiveTab("users")}><Users size={18} /> Manage Users</button>
                        <button onClick={() => setActiveTab("properties")}><Home size={18} /> Review Properties</button>
                        <button onClick={() => window.location.href = "/messages"}><MessageSquare size={18} /> Chat Logs</button>
                        <button onClick={() => toast.success("System optimized")}><Settings size={18} /> Clear Cache</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div className="admin-content-wrapper">
                  {/* Desktop View Table */}
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User Info</th>
                          <th>Contact</th>
                          <th>Last Active</th>
                          <th>Role & Status</th>
                          <th>Verified</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id} className={u.isBlocked ? 'row-blocked' : ''}>
                            <td>
                              <div className="u-info">
                                <div className="u-avatar" style={{ background: u.isBlocked ? '#fecaca' : '' }}>
                                  {u.profilePicture ? <img src={u.profilePicture} alt="" /> : u.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {u.name} {u.isBlocked && <AlertCircle size={14} color="#ef4444" />}
                                    {u.isOnline && <span className="online-status-indicator" title="Online now"></span>}
                                  </strong>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="u-contact">
                                <p><Mail size={12} /> {u.email}</p>
                                <p><Phone size={12} /> {u.phone}</p>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>
                                {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <select
                                  className={`role-badge ${u.role?.toLowerCase().replace(' ', '-')}`}
                                  value={u.role}
                                  onChange={(e) => handleUserUpdate(u.id, { role: e.target.value })}
                                >
                                  <option value="Property Finder">Finder</option>
                                  <option value="Agent">Agent</option>
                                  <option value="Property Seller">Seller</option>
                                  <option value="Company">Company</option>
                                  <option value="Admin">Admin</option>
                                </select>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Limit:</span>
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={u.propertyLimit !== undefined ? u.propertyLimit : 1}
                                    onChange={(e) => handleUserUpdate(u.id, { propertyLimit: parseInt(e.target.value) || 0 })}
                                    style={{ width: '60px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                                  />
                                  <select
                                    value={u.subscriptionStatus || 'Free'}
                                    onChange={(e) => handleUserUpdate(u.id, { subscriptionStatus: e.target.value })}
                                    style={{ marginLeft: '8px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                                  >
                                    <option value="Free">Free</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Trial">Trial</option>
                                  </select>
                                </div>
                                <button
                                  className={`status-toggle ${u.isBlocked ? 'blocked' : 'active'}`}
                                  onClick={() => handleUserUpdate(u.id, { isBlocked: !u.isBlocked })}
                                >
                                  {u.isBlocked ? 'Unblock User' : 'Block User'}
                                </button>
                              </div>
                            </td>
                            <td>
                              <button
                                className={`verify-btn ${u.isVerified ? 'verified' : ''}`}
                                onClick={() => handleUserUpdate(u.id, { isVerified: !u.isVerified })}
                              >
                                {u.isVerified ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#94a3b8" />}
                                <span>{u.isVerified ? 'Verified' : 'Unverified'}</span>
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-reset-pass" onClick={() => handleResetPassword(u.id)} title="Reset Password">
                                  <Key size={16} />
                                </button>
                                <button className="btn-delete" onClick={() => deleteUser(u.id)} title="Delete User">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="mobile-card-list mobile-only">
                    {filteredUsers.map(u => (
                      <div key={u.id} className={`admin-mobile-card ${u.isBlocked ? 'card-blocked' : ''}`}>
                        <div className="card-header">
                          <div className="u-info">
                            <div className="u-avatar" style={{ background: u.isBlocked ? '#fecaca' : '' }}>
                              {u.profilePicture ? <img src={u.profilePicture} alt="" /> : u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {u.name} {u.isBlocked && <AlertCircle size={14} color="#ef4444" />}
                                {u.isOnline && <span className="online-status-indicator" title="Online now"></span>}
                              </strong>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="card-body">
                          <div className="body-row"><Mail size={14} /> <span>{u.email}</span></div>
                          <div className="body-row"><Phone size={14} /> <span>{u.phone}</span></div>
                          <div className="body-row">
                            <span className="label">Last Login:</span>
                            <span className="value">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</span>
                          </div>
                          <div className="body-row actions-row">
                            <select
                              className={`role-badge ${u.role?.toLowerCase().replace(' ', '-')}`}
                              value={u.role}
                              onChange={(e) => handleUserUpdate(u.id, { role: e.target.value })}
                            >
                              <option value="Property Finder">Finder</option>
                              <option value="Agent">Agent</option>
                              <option value="Property Seller">Seller</option>
                              <option value="Company">Company</option>
                              <option value="Admin">Admin</option>
                            </select>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Limit:</span>
                              <input 
                                type="number" 
                                min="0"
                                value={u.propertyLimit !== undefined ? u.propertyLimit : 1}
                                onChange={(e) => handleUserUpdate(u.id, { propertyLimit: parseInt(e.target.value) || 0 })}
                                style={{ width: '50px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#1e293b' }}
                              />
                            </div>
                            <button
                              className={`status-toggle ${u.isBlocked ? 'blocked' : 'active'}`}
                              onClick={() => handleUserUpdate(u.id, { isBlocked: !u.isBlocked })}
                            >
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              className={`verify-btn ${u.isVerified ? 'verified' : ''}`}
                              onClick={() => handleUserUpdate(u.id, { isVerified: !u.isVerified })}
                              style={{ border: '1px solid #e2e8f0', borderRadius: '20px', padding: '4px 10px' }}
                            >
                              {u.isVerified ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#94a3b8" />}
                              <span style={{ fontSize: '11px' }}>{u.isVerified ? 'Verified' : 'Verify'}</span>
                            </button>
                          </div>
                        </div>
                        <div className="card-footer">
                          <button className="mobile-action-btn reset" onClick={() => handleResetPassword(u.id)}>
                            <Key size={14} /> Reset Password
                          </button>
                          <button className="mobile-action-btn delete" onClick={() => deleteUser(u.id)}>
                            <Trash2 size={14} /> Delete User
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredUsers.length === 0 && <div className="no-results">No users found matching your criteria.</div>}
                </div>
              )}

              {activeTab === "properties" && (
                <div className="admin-content-wrapper">
                  {/* Desktop View Table */}
                  <div className="admin-table-container desktop-only">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Property</th>
                          <th>Type & Status</th>
                          <th>Owner</th>
                          <th>Moderation</th>
                          <th>Visibility</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProps.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div className="u-info">
                                <div className="p-thumb">
                                  <img src={p.image || "https://via.placeholder.com/60x40"} alt="" />
                                </div>
                                <div>
                                  <strong>{p.title}</strong>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}><MapPin size={12} /> {p.city}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                               <div className="u-contact">
                                 <strong>{p.adType} ({p.possessionStatus || 'N/A'})</strong>
                                 <span style={{ fontSize: '11px', color: p.isTrial ? '#d97706' : '#2563eb', fontWeight: 700 }}>
                                   {getTrialStatusText(p)}
                                 </span>
                               </div>
                             </td>
                            <td>
                              <div className="u-contact">
                                <strong>{p.ownerDetails?.name || 'Unknown'}</strong>
                                <span>{p.ownerDetails?.email}</span>
                              </div>
                            </td>
                            <td>
                              <button
                                className={`moderation-btn ${p.isApproved ? 'approved' : 'pending'}`}
                                onClick={() => handlePropertyUpdate(p.id, { isApproved: !p.isApproved })}
                              >
                                {p.isApproved ? 'Approved' : 'Pending Approval'}
                              </button>
                            </td>
                            <td>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                 <button
                                   className={`feature-btn ${p.isFeatured ? 'featured' : ''}`}
                                   onClick={() => handlePropertyUpdate(p.id, { isFeatured: !p.isFeatured })}
                                   style={{ width: '100%' }}
                                 >
                                   <Star size={14} fill={p.isFeatured ? "currentColor" : "none"} />
                                   {p.isFeatured ? 'Featured' : 'Mark Featured'}
                                 </button>
                                 <button
                                   className={`status-toggle ${p.isHidden ? 'blocked' : 'active'}`}
                                   onClick={(e) => { e.stopPropagation(); handlePropertyUpdate(p.id, { isHidden: !p.isHidden }); }}
                                   style={{ padding: '6px 12px', fontSize: '11px', width: '100%', textAlign: 'center' }}
                                 >
                                   {p.isHidden ? 'Show Property' : 'Hide Property'}
                                 </button>
                               </div>
                             </td>
                            <td>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-view" onClick={() => window.open(`/property/${p.id}`, '_blank')}>
                                  <Eye size={16} />
                                </button>
                                <button className="btn-delete" onClick={() => deleteProperty(p.id)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Property List Cards */}
                  <div className="mobile-card-list mobile-only">
                    {paginatedProps.map(p => (
                      <div key={p.id} className="admin-mobile-card">
                        <div className="card-header">
                          <div className="u-info">
                            <div className="p-thumb" style={{ width: '50px', height: '50px', borderRadius: '8px' }}>
                              <img src={p.image || "https://via.placeholder.com/60x40"} alt="" />
                            </div>
                            <div>
                              <strong style={{ fontSize: '14px', display: 'block' }}>{p.title}</strong>
                              <span style={{ fontSize: '11px', color: '#64748b' }}><MapPin size={11} /> {p.city}</span>
                            </div>
                          </div>
                        </div>
                        <div className="card-body">
                          <div className="body-row">
                            <span className="label">Type:</span>
                            <strong className="value">{p.adType} ({p.possessionStatus || 'N/A'})</strong>
                          </div>
                          <div className="body-row">
                            <span className="label">Plan:</span>
                            <span className="value" style={{ color: p.isTrial ? '#d97706' : '#2563eb', fontWeight: 700 }}>{getTrialStatusText(p)}</span>
                          </div>
                          <div className="body-row">
                            <span className="label">Owner:</span>
                            <span className="value">{p.ownerDetails?.name || 'Unknown'} ({p.ownerDetails?.email || 'N/A'})</span>
                          </div>
                          <div className="body-row actions-row">
                            <button
                              className={`moderation-btn ${p.isApproved ? 'approved' : 'pending'}`}
                              onClick={() => handlePropertyUpdate(p.id, { isApproved: !p.isApproved })}
                              style={{ width: '100%', padding: '6px 12px' }}
                            >
                              {p.isApproved ? 'Approved' : 'Pending Approval'}
                            </button>
                            <button
                              className={`feature-btn ${p.isFeatured ? 'featured' : ''}`}
                              onClick={() => handlePropertyUpdate(p.id, { isFeatured: !p.isFeatured })}
                              style={{ width: '100%', padding: '6px 12px', justifyContent: 'center' }}
                            >
                              <Star size={12} fill={p.isFeatured ? "currentColor" : "none"} />
                              {p.isFeatured ? 'Featured' : 'Featured'}
                            </button>
                            <button
                              className={`status-toggle ${p.isHidden ? 'blocked' : 'active'}`}
                              onClick={() => handlePropertyUpdate(p.id, { isHidden: !p.isHidden })}
                              style={{ width: '100%', padding: '6px 12px', textAlign: 'center' }}
                            >
                              {p.isHidden ? 'Show Property' : 'Hide Property'}
                            </button>
                          </div>
                        </div>
                        <div className="card-footer">
                          <button className="mobile-action-btn view" onClick={() => window.open(`/property/${p.id}`, '_blank')} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                            <Eye size={14} /> View Details
                          </button>
                          <button className="mobile-action-btn delete" onClick={() => deleteProperty(p.id)}>
                            <Trash2 size={14} /> Delete Property
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
                  </div>
                  {filteredProps.length === 0 && <div className="no-results">No properties found.</div>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .admin-layout { display: flex; min-height: 100vh; background: #f8fafc; padding: 0 !important; font-family: 'Inter', sans-serif; transition: all 0.3s ease; }
        .admin-mobile-bar { display: none; width: 100%; height: 60px; background: #1e293b; color: white; align-items: center; justify-content: space-between; padding: 0 20px; position: fixed; top: 0; left: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .mobile-logo { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 18px; color: #fbbf24; }
        .mobile-menu-toggle { background: transparent; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .admin-sidebar { width: 280px; background: #0f172a; color: white; padding: 30px 0; display: flex; flex-direction: column; position: fixed; height: 100vh; z-index: 999; box-shadow: 4px 0 15px rgba(15,23,42,0.1); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow-y: auto; }
        .admin-logo { padding: 0 30px 40px; display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 800; color: #fbbf24; justify-content: space-between; }
        .sidebar-close-btn { display: none; background: transparent; border: none; color: #94a3b8; cursor: pointer; }
        .admin-sidebar nav { display: flex; flex-direction: column; gap: 6px; padding: 0 15px; flex: 1; }
        .admin-sidebar nav button { display: flex; align-items: center; gap: 12px; background: transparent; border: none; color: #94a3b8; padding: 14px 15px; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s ease; text-align: left; width: 100%; font-size: 15px; }
        .admin-sidebar nav button.active { background: #334155; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .admin-sidebar nav button:hover:not(.active) { background: rgba(255,255,255,0.04); color: #cbd5e1; }
        .admin-sidebar-footer { padding: 20px; border-top: 1px solid #1e293b; }
        .sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 998; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .admin-main { flex: 1; margin-left: 280px; padding: 40px; min-height: 100vh; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
        .admin-header h1 { font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 5px; }
        .admin-header p { color: #64748b; font-size: 16px; }
        .admin-controls { display: flex; gap: 15px; align-items: center; }
        .admin-search { display: flex; align-items: center; gap: 10px; background: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); width: 320px; border: 1px solid #e2e8f0; }
        .admin-search input { border: none; outline: none; width: 100%; font-size: 14px; color: #1e293b; }
        .role-filter { padding: 12px 15px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; outline: none; font-weight: 600; color: #475569; cursor: pointer; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 32px; }
        .stat-card { background: white; padding: 24px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); position: relative; border: 1px solid #e2e8f0; transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.05); }
        .stat-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .stat-icon.users { background: #dbeafe; color: #2563eb; }
        .stat-icon.properties { background: #dcfce7; color: #16a34a; }
        .stat-icon.views { background: #fef3c7; color: #d97706; }
        .stat-icon.agents { background: #f3e8ff; color: #9333ea; }
        .stat-info span { color: #64748b; font-size: 14px; font-weight: 600; }
        .stat-info h3 { font-size: 32px; font-weight: 800; color: #1e293b; margin-top: 4px; }
        .stat-trend { position: absolute; top: 24px; right: 24px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 20px; }
        .stat-trend.positive { background: #dcfce7; color: #166534; }
        .admin-two-col { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; }
        .role-distribution-card, .recent-activity-card { background: white; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .role-distribution-card h3, .recent-activity-card h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
        .distribution-bars { display: flex; flex-direction: column; gap: 20px; }
        .dist-item { display: flex; align-items: center; gap: 15px; }
        .dist-item span:first-child { width: 90px; font-size: 14px; font-weight: 600; color: #64748b; }
        .bar-bg { flex: 1; height: 12px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 6px; transition: width 1s ease-out; }
        .dist-count { font-weight: 700; color: #1e293b; font-size: 14px; width: 30px; text-align: right; }
        .quick-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .quick-actions-grid button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 20px; border-radius: 16px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #475569; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px; }
        .quick-actions-grid button:hover { background: #f1f5f9; border-color: #3b82f6; color: #3b82f6; }
        .admin-table-container { background: white; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02); overflow-x: auto; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
        .admin-table th { padding: 18px 24px; background: #f8fafc; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .admin-table td { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .row-blocked { opacity: 0.7; background: #fff1f2; }
        .u-info { display: flex; align-items: center; gap: 15px; min-width: 0; }
        .u-avatar { width: 44px; height: 44px; background: #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #1e293b; overflow: hidden; flex-shrink: 0; }
        .u-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .p-thumb { width: 60px; height: 45px; border-radius: 8px; overflow: hidden; background: #e2e8f0; flex-shrink: 0; }
        .p-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .u-contact p { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; margin-bottom: 4px; word-break: break-all; }
        .role-badge { border: none; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; outline: none; cursor: pointer; width: fit-content; text-transform: uppercase; }
        .role-badge.property-finder { background: #dcfce7; color: #166534; }
        .role-badge.agent { background: #dbeafe; color: #1e40af; }
        .role-badge.property-seller { background: #fef3c7; color: #92400e; }
        .role-badge.company { background: #f3e8ff; color: #6b21a8; }
        .role-badge.admin { background: #ffedd5; color: #9a3412; }
        .status-toggle { background: transparent; border: 1px solid #e2e8f0; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; width: fit-content; }
        .status-toggle.active { color: #ef4444; border-color: #fecaca; }
        .status-toggle.blocked { background: #ef4444; color: white; border-color: #ef4444; }
        .verify-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: none; cursor: pointer; padding: 5px; border-radius: 8px; transition: all 0.2s; }
        .verify-btn:hover { background: #f1f5f9; }
        .verify-btn span { font-size: 13px; font-weight: 600; color: #64748b; }
        .verify-btn.verified span { color: #10b981; }
        .moderation-btn { border: none; padding: 8px 15px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .moderation-btn.approved { background: #dcfce7; color: #166534; }
        .moderation-btn.pending { background: #fee2e2; color: #b91c1c; }
        .feature-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; color: #64748b; }
        .feature-btn.featured { background: #fffbeb; border-color: #fcd34d; color: #d97706; }
        .btn-delete, .btn-view, .btn-reset-pass { background: #f1f5f9; color: #64748b; border: none; padding: 10px; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .btn-delete:hover { background: #fee2e2; color: #dc2626; }
        .btn-view:hover { background: #dbeafe; color: #2563eb; }
        .btn-reset-pass:hover { background: #ecfdf5; color: #10b981; }
        .no-results { padding: 60px; text-align: center; color: #94a3b8; font-weight: 500; }
        .admin-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; gap: 20px; color: #64748b; }
        .online-status-indicator { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        .admin-mobile-card { background: white; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.01); }
        .card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
        .card-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .body-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; min-width: 0; }
        .body-row .label { color: #64748b; width: 80px; font-weight: 600; flex-shrink: 0; }
        .body-row .value { color: #1e293b; font-weight: 600; word-break: break-all; overflow-wrap: anywhere; text-align: left; }
        .body-row span { word-break: break-all; overflow-wrap: anywhere; }
        .body-row.actions-row { flex-wrap: wrap; gap: 8px; margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
        .card-footer { padding: 16px 20px; border-top: 1px solid #f1f5f9; display: flex; gap: 12px; background: #f8fafc; flex-wrap: wrap; }
        .mobile-action-btn { flex: 1; min-width: 110px; padding: 10px; border-radius: 10px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; }
        .mobile-action-btn.reset { background: #ecfdf5; color: #10b981; }
        .mobile-action-btn.delete { background: #fee2e2; color: #dc2626; }
        .mobile-action-btn.view { background: #dbeafe; color: #2563eb; }
        .card-blocked { opacity: 0.8; border-color: #fecaca; }
        .card-blocked .card-header { background: #fff1f2; }
        .admin-sidebar nav button:active { transform: scale(0.98); }
        .admin-mobile-card { transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease; }
        .admin-mobile-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(15,23,42,0.06); }
        .sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 998; animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        @media (max-width: 1200px) { 
          .admin-two-col { grid-template-columns: 1fr; } 
        }
        @media (max-width: 1024px) { 
          .admin-sidebar { width: 80px; } 
          .admin-logo span, .admin-sidebar button span, .admin-sidebar-footer .u-info div { display: none; } 
          .admin-sidebar nav { padding: 0 10px; }
          .admin-main { margin-left: 80px; padding: 30px; } 
          .admin-logo { padding: 0 0 40px; justify-content: center; }
          
          /* Table to Card List Toggle on Tablet for better readability */
          .desktop-only { display: none; }
          .mobile-only { display: block; }
          
          /* Elegant layout wrapping of filter inputs and stats */
          .admin-header { flex-direction: column; align-items: flex-start; gap: 20px; margin-bottom: 30px; }
          .admin-controls { width: 100%; flex-direction: column; align-items: stretch; gap: 12px; }
          .admin-search { width: 100%; }
          .role-filter { width: 100%; }
          
          /* Quick actions wrap beautifully */
          .quick-actions-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .mobile-only { display: block; }
          .admin-mobile-bar { display: flex; }
          .admin-main { margin-left: 0; padding: 90px 20px 30px; }
          .admin-sidebar { transform: translateX(-100%); width: 280px; z-index: 1001; transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-logo span, .admin-sidebar button span, .admin-sidebar-footer .u-info div { display: block; }
          .admin-logo { justify-content: space-between; }
          .sidebar-close-btn { display: flex; }
          .admin-header { flex-direction: column; align-items: flex-start; gap: 15px; margin-bottom: 25px; }
          .admin-header h1 { font-size: 26px; }
          .admin-controls { width: 100%; flex-direction: column; align-items: stretch; gap: 10px; }
          .admin-search { width: 100%; }
          .role-filter { width: 100%; }
          .stats-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
          .stat-card { padding: 18px; border-radius: 16px; }
          .stat-info h3 { font-size: 24px; }
          .distribution-bars { gap: 15px; }
          .dist-item { flex-direction: column; align-items: flex-start; gap: 5px; }
          .dist-item span:first-child { width: 100%; }
          .dist-count { width: 100%; text-align: left; }
          .quick-actions-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 380px) {
          .card-footer { flex-direction: column; gap: 8px; }
          .mobile-action-btn { width: 100%; }
        }
      `}} />
    </div>
  );
};

export default AdminDashboard;
