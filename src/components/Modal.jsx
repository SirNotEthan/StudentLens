import React from 'react';
import '../styles/Modal.css';

export const Modal = ({ isOpen, onClose, title, children, type = 'info', showCloseButton = true }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && showCloseButton) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className={`modal-container modal-${type}`}>
        <div className="modal-header">
          <div className="modal-icon">{getIcon()}</div>
          <h2 className="modal-title">{title}</h2>
          {showCloseButton && (
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              &times;
            </button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} type={type} showCloseButton={false}>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button className="modal-btn modal-btn-cancel" onClick={onClose}>
          {cancelText}
        </button>
        <button className={`modal-btn modal-btn-confirm modal-btn-${type}`} onClick={handleConfirm}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export const AlertModal = ({ isOpen, onClose, title, message, type = 'info', buttonText = 'OK' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} type={type}>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button className={`modal-btn modal-btn-primary modal-btn-${type}`} onClick={onClose}>
          {buttonText}
        </button>
      </div>
    </Modal>
  );
};

export default Modal;
