// d:\Coding\Mast Pharmacy\frontend\src\components\common\ConfirmDialog.js
import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  if (!isOpen) return null;
  
  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <div className={`confirm-dialog-header ${type}`}>
          <h3>{title || 'Confirmation'}</h3>
        </div>
        <div className="confirm-dialog-body">
          <p>{message || 'Are you sure you want to proceed?'}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button 
            className="confirm-dialog-button cancel" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-dialog-button ${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
