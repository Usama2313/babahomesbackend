import React from 'react';

const InvalidTokenToast = ({ t }) => (
  <div style={{
    background: t.visible ? '#fff' : '#fff',
    color: '#333',
    padding: '10px 14px',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center'
  }}>
    <span style={{ marginRight: '8px' }}>
      Token is not valid – please log in again.
    </span>
    <a href="https://wa.me/973322271249" target="_blank" style={{ color: '#1e90ff', textDecoration: 'underline' }}>
      WhatsApp +973322271249
    </a>
  </div>
);

export default InvalidTokenToast;
