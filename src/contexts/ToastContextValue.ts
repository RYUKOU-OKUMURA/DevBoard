import { createContext } from 'react';
import type { ToastMessage } from '../types';

export interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
