import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { paymentConstants } from '../utils/paymentConstants';
import { pricingConstants } from '../utils/pricingConstants';
import './PaymentModal.css';
import { X, Loader2, ArrowRight, Award, ShieldCheck, MessageSquare, DollarSign } from 'lucide-react';
import QRcodeImg from "../assets/QRcode.jpeg";

/**
 * PaymentModal
 * Props:
 *   isOpen: boolean - controls visibility
 *   onClose: function - callback to close the modal
 *   region: string ('india' | 'gcc') - determines which IBAN to display
 *   onPayNow: function
 *   onFreeTrial: function
 */


const PaymentModal = ({ isOpen, onClose, region = 'india', onPayNow, onFreeTrial, trialCount = 0, userName = '', userPhone = '', propertyId = '', propertyTitle = '' }) => {
  const [selectedTier, setSelectedTier] = useState('one'); // 'one', 'ten', 'fifty', 'custom'
  const [customQty, setCustomQty] = useState(2);
  const [price, setPrice] = useState('400 Phills');
  const [loading, setLoading] = useState(true);
  const [freeTrialLoading, setFreeTrialLoading] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Helper to calculate price
  const calculatePrice = (tier, qty) => {
    if (tier === 'one') return '400 Phills';
    if (tier === 'ten') return '5 BHD';
    if (tier === 'fifty') return '20 BHD';

    // Custom calculation (400 Phills = 0.4 BHD per property)
    const totalFils = qty * 400;
    if (totalFils >= 1000) {
      const bhd = totalFils / 1000;
      return `${bhd.toFixed(1)} BHD`;
    }
    return `${totalFils} Phills`;
  };

  // Update calculated price whenever selected tier or custom quantity changes
  useEffect(() => {
    setPrice(calculatePrice(selectedTier, customQty));
  }, [selectedTier, customQty]);

  // Simulate loading after opening the modal
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const iban = region === 'gcc' ? paymentConstants.IBAN_GCC : paymentConstants.IBAN_INDIA;

  // Previously handled payment submission; now we directly open WhatsApp for payment.
  const handleWhatsAppSubmit = () => {
    // Open WhatsApp with a prefilled message for payment.
    const message = encodeURIComponent('I would like to pay for the selected plan.');
    window.open(`https://wa.me/97332271249?text=${message}`, '_blank');
  };


  return ReactDOM.createPortal(
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <button className="payment-modal-close-btn" onClick={onClose} aria-label="Close payment modal">
          <X size={18} />
        </button>
        {loading ? (
          <div className="payment-loader-section">
            <Loader2 className="spinner-animation" size={40} />
            <p>Configuring payment gateway...</p>
          </div>
        ) : (
          <div className="payment-content-section">
            <div className="modal-header-badge">
              <Award className="badge-icon" size={16} />
              <span>Premium Listing</span>
            </div>

            <h2>Complete Your Payment</h2>

            <p className="payment-description">
              Please transfer the amount to the following IBAN manually:
            </p>

            <div className="qr-code-box" style={{ textAlign: 'center', marginTop: '20px' }}>
              <h3>Payment QR Code</h3>
              <img src={QRcodeImg} alt="Payment QR Code" style={{ width: '200px', margin: '10px auto' }} />
            </div>

            <div className="plan-selection-container">
              <label className="plan-selection-label">Select Your Desired Plan:</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="plan-select-dropdown"
              >
                <option value="one">1 Property – 400 Phills</option>
                <option value="ten">10 Properties – 5 BHD</option>
                <option value="fifty">50 Properties – 20 BHD</option>
                <option value="custom">Custom Quantity (400 Phills / Property)</option>
              </select>
            </div>

            {selectedTier === 'custom' && (
              <div className="custom-qty-form-group">
                <label>Number of Properties:</label>
                <div className="qty-input-wrapper">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={customQty}
                    onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="custom-qty-input"
                  />
                  <span className="qty-unit">properties</span>
                </div>
              </div>
            )}

            <div className="pricing-summary-card">
              <span className="price-label">Selected plan price:</span>
              <div className="price-value-container">
                <DollarSign size={20} className="dollar-icon" />
                <span className="price-value">{price}</span>
              </div>
              <button 
                className="confirm-payment-btn" 
                onClick={() => setPaymentConfirmed(true)}
                style={{ marginTop: '10px', width: '100%' }}
              >
                Confirm Payment Details
              </button>
              {paymentConfirmed && (
                <div className="confirmed-details" style={{ marginTop: '15px', padding: '10px', background: '#e6fffa', borderRadius: '4px' }}>
                  <p><strong>Payment Status:</strong> Confirmed</p>
                  <p><strong>Plan:</strong> {selectedTier} ({price})</p>
                  <p><strong>Name:</strong> {userName}</p>
                  <p><strong>Phone:</strong> {userPhone}</p>
                  <p><strong>Property ID:</strong> {propertyId}</p>
                  <p><strong>Title:</strong> {propertyTitle}</p>
                </div>
              )}
            </div>

            {/* QR code always visible */}

            {/* Action buttons */}
            <div className="modal-actions-row">
                <button
                  className="buffer-share-btn"
                  onClick={() => {
                    const text = encodeURIComponent(`Check out this property: ${window.location.href}`);
                    window.open(`https://publish.buffer.com/compose?text=${text}`, '_blank');
                  }}
                  style={{ padding: '8px 12px', background: '#14171A', color: '#fff', borderRadius: '4px' }}
                >Share on Buffer</button>

              <div className="secondary-actions-group">
                {onFreeTrial && (
                  <button 
                    className="free-trial-activation-btn" 
                    onClick={async () => {
                      if (trialCount >= 10) return;
                      setFreeTrialLoading(true);
                      try {
                        await onFreeTrial();
                      } finally {
                        setFreeTrialLoading(false);
                      }
                    }} 
                    disabled={freeTrialLoading || trialCount >= 10}
                    style={trialCount >= 10 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {freeTrialLoading ? (
                      <Loader2 className="spinner-animation" size={20} />
                    ) : (
                      `Free Trial (15 Days) – ${trialCount}/10 Used`
                    )}
                  </button>
                )}
                <button className="modal-close-cancel-btn" onClick={onClose}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PaymentModal;
