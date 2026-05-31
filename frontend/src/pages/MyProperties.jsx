import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Plus, Trash2, Edit, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import PaymentModal from '../components/PaymentModal';

const MyProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateProperty, setReactivateProperty] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const user = JSON.parse(localStorage.getItem('babaUser') || '{}');

  const getStatusBadge = (p) => {
    const now = new Date();
    const isExpiredTrial = p.isTrial && p.trialExpiresAt && new Date(p.trialExpiresAt) <= now;
    
    if (p.isHidden) {
      return { text: 'Hidden by Admin', bg: '#ef4444', color: 'white' };
    }
    if (p.isTrial) {
      if (isExpiredTrial) {
        return { text: 'Trial Expired', bg: '#dc2626', color: 'white' };
      } else {
        const diffTime = new Date(p.trialExpiresAt) - now;
        const diffDays = Math.min(15, Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
        return { text: `Trial: ${diffDays} days left`, bg: '#10b981', color: 'white' };
      }
    }
    return { text: 'Active', bg: '#2563eb', color: 'white' };
  };

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const fetchMyProperties = async () => {
    try {
      setLoading(true);
      const res = await API.get('/properties', { params: { owner: user.id } });
      // Exclude hidden properties for regular users
      // Retrieve hidden property IDs from localStorage
      const hiddenIds = JSON.parse(localStorage.getItem('hiddenProperties') || '[]');
      const filtered = (res.data.data || []).filter(p => !p.isHidden && !hiddenIds.includes(p.id));
      setProperties(filtered);
      // Store hidden IDs for future reloads
      const updateHiddenIds = (propId, hide) => {
        const ids = JSON.parse(localStorage.getItem('hiddenProperties') || '[]');
        const newIds = hide ? [...new Set([...ids, propId])] : ids.filter(id => id !== propId);
        localStorage.setItem('hiddenProperties', JSON.stringify(newIds));
      };
      // Expose update function via window for admin hide action
      window.updateHiddenProperty = updateHiddenIds;
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast.error("Failed to load your properties");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (id) => {
    setPropertyToDelete(id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPropertyToDelete(null);
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      handleDelete(propertyToDelete);
    }
    closeDeleteModal();
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/properties/${id}`);
      toast.success('Property deleted successfully');
      setProperties(properties.filter(p => p.id !== id));
    } catch (error) {
      toast.error('Failed to delete property');
    }
  };

  if (loading) {
    return <div className="pageMessage">Loading your properties...</div>;
  }

  return (
    <div className="my-properties-page premiumDetailsContainer">
      <div className="pd-header-nav">
        <h1>My Properties</h1>
        <Link to="/post-property">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="navSellBtn"
            style={{ padding: '10px 20px', borderRadius: '8px' }}
          >
            <Plus size={18} /> Post New Property
          </motion.button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
          style={{ textAlign: 'center', padding: '100px 20px' }}
        >
          <Home size={64} color="#ccc" style={{ marginBottom: '20px' }} />
          <h2>You haven't posted any properties yet</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>Start listing your properties today and reach thousands of potential tenants!</p>
          <Link to="/post-property">
            <button className="pd-contact-btn" style={{ maxWidth: '250px', margin: '0 auto' }}>
              Post Your First Property
            </button>
          </Link>
        </motion.div>
      ) : (
        <div className="properties-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px', marginTop: '30px' }}>
          {properties.map((property) => {
            let gallery = [];
            try {
              gallery = typeof property.gallery === 'string' ? JSON.parse(property.gallery) : (property.gallery || []);
            } catch (e) { gallery = []; }

            const mainImg = (property.image && property.image !== "" && property.image !== "undefined" && property.image !== "null") ? property.image : (gallery.length > 0 ? gallery[0] : "https://via.placeholder.com/600x400?text=Baba+Homs+Property");

            return (
              <motion.div 
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pd-price-card"
                style={{ padding: '0', overflow: 'hidden' }}
              >
                <div style={{ height: '200px', width: '100%', background: '#eee', position: 'relative' }}>
                  <img 
                    src={mainImg} 
                    alt={property.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Status Badge */}
                  {(() => {
                    const badge = getStatusBadge(property);
                    return (
                      <span style={{ 
                        position: 'absolute', 
                        bottom: '10px', 
                        left: '10px', 
                        background: badge.bg, 
                        color: badge.color, 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}>
                        {badge.text}
                      </span>
                    );
                  })()}
                  {/* Action Buttons */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
                    <Link to={`/edit-property/${property.id}`} className="pd-icon-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#1a73e8' }}>
                      <Edit size={16} />
                    </Link>
                    <button onClick={() => openDeleteModal(property.id)} className="pd-icon-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#f44336' }}>
                      <Trash2 size={16} />
                    </button>
                    {property.isTrial && (new Date(property.trialExpiresAt) <= new Date()) && (
                      <button onClick={() => { setSelectedProperty(property); setShowPaymentModal(true); }} className="pd-icon-btn" style={{ background: '#fffae6', color: '#ff9800' }}>
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {property.title || `${property.bhkType} ${property.apartmentType}`}
                  </h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                    {property.locality}, {property.city}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '18px', color: '#1a73e8' }}>
                      {property.currency || '₹'} {property.rentAmount || property.price}
                    </strong>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Link to={`/property/${property.id}`} className="pd-back" style={{ fontSize: '14px', padding: '5px 10px' }}>
                        View <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this property? This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={confirmDelete} className="modal-confirm">Delete</button>
              <button onClick={closeDeleteModal} className="modal-cancel"><X size={16} /> Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal for Reactivation */}
      {selectedProperty && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setSelectedProperty(null); }}
          region="india"
          trialCount={user.trialPropertiesCount || 0}
          onPayNow={async (payload) => {
            try {
              try {
                await API.post(`/properties/${selectedProperty.id}/pay`, payload, { skipToast: true });
              } catch (err) {
                const errorMsg = err.response?.data?.message || '';
                const isLimitError = errorMsg.toLowerCase().includes('limit') || err.response?.status === 403;
                if (isLimitError) {
                  console.log("Bypassing limit check error for WhatsApp reactivation redirection");
                } else {
                  throw err;
                }
              }

              toast.success('Property reactivation request submitted! Redirecting to WhatsApp...');
              
              const waNumber = "+97332271249";
              const message = `Hello Admin! I have requested to reactivate/pay for my property listing on Baba Homs and completed the bank transfer.

*User Details:*
- Name: ${user.name || 'N/A'}
- Phone: ${user.phone || 'N/A'}

*Listing Details:*
- Property ID: ${selectedProperty.id}
- Title: ${selectedProperty.title}
- Plan Selected: ${payload.label}
- Amount: ${payload.price}

Here is the transfer receipt screenshot. Please verify it and activate my property listing.`;

              const waUrl = `https://wa.me/${waNumber.replace('+', '').replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;
              window.open(waUrl, '_blank');

              setShowPaymentModal(false);
              setSelectedProperty(null);
              fetchMyProperties();
            } catch (e) {
              toast.error(e.response?.data?.message || 'Payment failed');
            }
          }}
          onFreeTrial={
            (selectedProperty.isTrial && selectedProperty.trialExpiresAt && new Date(selectedProperty.trialExpiresAt) <= new Date())
              ? undefined
              : async () => {
                  try {
                    await API.post(`/properties/${selectedProperty.id}/free-trial`);
                    toast.success('Free trial activated');
                    fetchMyProperties();
                  } catch (e) {
                    toast.error(e.response?.data?.message || 'Failed to activate free trial');
                  }
                }
          }
        />
      )}
    </div>
  );
};

export default MyProperties;
