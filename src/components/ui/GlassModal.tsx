import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import { focusRing } from '../../lib/focusRing';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
  closeLabel?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  className = 'max-w-3xl',
  children,
  closeLabel = '閉じる',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selectors =
      'a[href], button:not([disabled]):not([aria-hidden]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () => {
      if (!dialogRef.current) {
        return [];
      }
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(selectors)
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    };

    const focusFirstElement = () => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusFirstElement();

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(103, 58, 183, 0.25)',
              backdropFilter: 'blur(12px)',
            }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            ref={dialogRef}
            className={`relative w-full ${className} rounded-3xl border border-transparent shadow-2xl`}
            style={{
              background: 'linear-gradient(135deg, rgba(15,15,15,0.95), rgba(25,25,25,0.9))',
              borderImage: 'linear-gradient(135deg, rgba(229,57,53,0.75), rgba(103,58,183,0.6)) 1',
              boxShadow: '0 35px 80px rgba(0,0,0,0.45), inset 0 1px 0 var(--metallic-edge-top)',
              backdropFilter: 'blur(30px)',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? closeLabel}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              {title ? (
                <h2 className="text-title-2 font-semibold text-[var(--text-primary)]">{title}</h2>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={onClose}
                className={`ml-2 inline-flex items-center justify-center rounded-full p-2 text-[var(--text-muted)] transition-colors ${focusRing.default} ${focusRing.brand}`}
                aria-label={closeLabel}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
