import React from 'react';

export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-container" id="toastContainer">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
