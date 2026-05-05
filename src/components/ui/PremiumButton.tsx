import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';
import { focusRing } from '../../lib/focusRing';

export interface PremiumButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode;
}

export function PremiumButton({
  children,
  className = '',
  type = 'button',
  ...props
}: PremiumButtonProps) {
  return (
    <motion.button
      type={type}
      {...props}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full px-inset-lg py-inset-sm text-title-3 font-semibold uppercase tracking-wide motion-safe:transition-transform motion-safe:duration-200 motion-reduce:transition-none ${focusRing.default} ${focusRing.brand} ${className}`}
      style={{
        background: 'var(--brand-gradient)',
        backgroundSize: '200% 100%',
        backgroundPosition: '0% 50%',
        color: 'var(--text-inverse)',
        border: 'none',
        boxShadow:
          'inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 -6px 12px rgba(0,0,0,0.35), 0 25px 45px rgba(0,0,0,0.35)',
      }}
      whileHover={{
        scale: 1.02,
        y: -2,
        backgroundPosition: '100% 50%',
        transition: { duration: 0.45, ease: 'easeInOut' },
      }}
      whileTap={{ scale: 0.98, transition: { duration: 0.12 } }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          backgroundImage: 'var(--metallic-noise)',
          opacity: 0.5,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          animation: 'metallic-shimmer 2.8s ease-in-out infinite',
          background:
            'linear-gradient(120deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 65%)',
          opacity: 0.65,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ animation: 'metallic-glow 5s ease-in-out infinite alternate' }}
      />
      <span className="relative z-10 flex items-center justify-center gap-inline-md">
        {children}
      </span>
    </motion.button>
  );
}
