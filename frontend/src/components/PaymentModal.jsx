import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { paymentConstants } from '../utils/paymentConstants';
import { pricingConstants } from '../utils/pricingConstants';
import './PaymentModal.css';

/**
 * PaymentModal
 * Props:
 *   isOpen: boolean - controls visibility
 *   onClose: function - callback to close the modal
 *   region: string ('india' | 'gcc') - determines which IBAN to display
 *   onPayNow: function
 *   onFreeTrial: function
 */
import { Loader2, X, MessageSquare, Award, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, region = 'india', onPayNow, onFreeTrial, trialCount = 0 }) => {
  const [selectedTier, setSelectedTier] = useState('one'); // 'one', 'ten', 'fifty', 'custom'
  const [customQty, setCustomQty] = useState(2);
  const [price, setPrice] = useState('400 Phills');
  const [loading, setLoading] = useState(true);
  const [freeTrialLoading, setFreeTrialLoading] = useState(false);
const [whatsappLoading, setWhatsappLoading] = useState(false);


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

  const handleWhatsAppSubmit = async () => {
  setWhatsappLoading(true);
  try {
    const planLabel = (() => {
      if (selectedTier === 'one') return '1 Property Plan';
      if (selectedTier === 'ten') return '10 Properties Plan';
      if (selectedTier === 'fifty') return '50 Properties Plan';
      return `Custom Plan (${customQty} Properties)`;
    })();
    await onPayNow({
      tier: selectedTier,
      quantity: selectedTier === 'custom' ? customQty : (selectedTier === 'one' ? 1 : selectedTier === 'ten' ? 10 : 50),
      price: price,
      label: planLabel
    });
  } finally {
    setWhatsappLoading(false);
  }
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

            <div className="iban-card-box">
              <div className="iban-header">
                <ShieldCheck size={16} className="shield-icon" />
                <span>OFFICIAL BABA HOMS IBAN</span>
              </div>
              <code className="iban-number">{iban}</code>
            </div>

            <div className="whatsapp-instruction-box">
              <MessageSquare className="wa-icon" size={20} />
              <div className="wa-text-content">
                <h4>Payment Screenshot Verification</h4>
                <p>After completing the transfer, please send the payment screenshot on WhatsApp to activate your listing:</p>
                <a href={`https://wa.me/97332271249`} target="_blank" rel="noreferrer" className="wa-number-link">+973 32271249</a>
              </div>
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
            </div>

            <div className="modal-actions-row">
              <button
  className="submit-whatsapp-payment-btn"
  onClick={handleWhatsAppSubmit}
  disabled={whatsappLoading}
>
  {whatsappLoading ? <Loader2 className="spinner-animation" size={20} /> : <span>Submit & Pay via WhatsApp</span>}
  <ArrowRight size={16} />
</button>


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
