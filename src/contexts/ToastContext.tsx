import React, { useCallback, useRef, useState } from 'react';
import { Toast } from '../components/ui/Toast';
import { ToastContext } from './ToastContextValue';
import type { ToastMessage } from '../types';

type ToastPayload = Omit<ToastMessage, 'id'>;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const showToast = useCallback(
    (toast: ToastPayload) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const nextToast: ToastMessage = { id, ...toast };
      setToasts((prev) => [...prev, nextToast]);
      const duration = toast.duration ?? 3000;
      if (duration > 0) {
        timersRef.current[id] = window.setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};
