import React, { createContext, useContext, useState, useCallback } from 'react';

export const NotificationContext = createContext(null);

let _nextId = 1;

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = _nextId++;
    setToasts(prev => [...prev, { id, message, type, duration, exiting: false }]);

    // Mark exiting (triggers slide-out animation) slightly before removal
    setTimeout(() => {
      setToasts(prev =>
        prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
      );
    }, duration);

    // Remove from state
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration + 350);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 350);
  }, []);

  return (
    <NotificationContext.Provider value={{ addToast, dismiss, toasts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within a NotificationProvider');

  return {
    success: (msg, duration) => ctx.addToast(msg, 'success', duration),
    error:   (msg, duration) => ctx.addToast(msg, 'error',   duration),
    info:    (msg, duration) => ctx.addToast(msg, 'info',    duration),
    warning: (msg, duration) => ctx.addToast(msg, 'warning', duration),
    dismiss: ctx.dismiss,
    toasts:  ctx.toasts,
  };
}
