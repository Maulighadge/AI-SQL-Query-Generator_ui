import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div 
            key={toast.id} 
            className={`toast-item ${toast.type || 'info'} animate-fade-in`}
            role="status"
          >
            <div className="toast-icon">
              {isSuccess && <CheckCircle2 size={16} className="text-emerald" />}
              {isError && <AlertCircle size={16} className="text-rose" />}
              {!isSuccess && !isError && <Info size={16} className="text-cyan" />}
            </div>
            <div className="toast-content">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              <div className="toast-message">{toast.message}</div>
            </div>
            <button 
              className="toast-close" 
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
