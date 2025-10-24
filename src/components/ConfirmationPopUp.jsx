import React from 'react';
import './ConfirmationPopUp.css';

function ConfirmationPopup({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="popup-overlay">
      <div className="confirm-popup-container">
        <div className="confirm-popup-header">
          <h2 className="confirm-popup-title">{title || 'Konfirmasi'}</h2>
          <button className="confirm-popup-close" onClick={onClose}>&times;</button>
        </div>
        <div className="confirm-popup-content">
          <p>{message}</p>
        </div>
        <div className="confirm-popup-actions">
          <button className="confirm-btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button className="confirm-btn-confirm" onClick={onConfirm}>
            Yakin
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationPopup;
