import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { ToastMessage } from '../../types';

const VARIANT_META: Record<
  ToastMessage['variant'],
  { background: string; accent: string; icon: React.ReactNode }
> = {
  success: {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.92), rgba(37,99,235,0.95))',
    accent: 'rgba(16,185,129,0.6)',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    background: 'linear-gradient(135deg, rgba(229,83,77,0.95), rgba(191,41,51,0.92))',
    accent: 'rgba(229,83,77,0.7)',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h4l1 7v5H9v-5z" />
      </svg>
    ),
  },
};

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => (
  <div className="pointer-events-none fixed top-4 left-1/2 z-50 flex w-full max-w-xl -translate-x-1/2 flex-col gap-stack-sm px-inset-md">
    <AnimatePresence initial={false}>
      {toasts.map((toast) => {
        const meta = VARIANT_META[toast.variant];
        return (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              background: meta.background,
              borderColor: 'rgba(255,255,255,0.2)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35), inset 0 1px 0 var(--metallic-edge-top)',
              backdropFilter: 'blur(22px)',
            }}
          >
            <div className="flex items-center gap-inline-md px-inset-lg py-inset-sm">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow"
                style={{ border: `1px solid ${meta.accent}` }}
              >
                {meta.icon}
              </span>
              <div className="flex-1">
                <p className="text-body-sm font-semibold tracking-tight text-white">{toast.title}</p>
                {toast.description && (
                  <p className="text-caption text-white/90 opacity-90">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(toast.id)}
                className="text-white/80 rounded-full p-2 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-70"
                aria-label="通知を閉じる"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);
