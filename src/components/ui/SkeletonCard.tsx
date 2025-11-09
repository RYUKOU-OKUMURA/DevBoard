import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div
    aria-hidden="true"
    className="relative bg-surface rounded-xl border border-[var(--border-subtle)] shadow-sm overflow-hidden p-inset-lg motion-reduce:animate-none"
  >
    <div
      className="h-6 rounded-lg mb-stack-xs motion-reduce:animate-none"
      style={{
        background: 'var(--brand-gradient)',
        backgroundSize: '200% 100%',
        opacity: 0.1,
        animation: 'gradient-flow 1.5s ease infinite',
      }}
    />
    <div
      className="h-4 rounded-lg w-3/4 motion-reduce:animate-none"
      style={{
        background: 'var(--brand-gradient)',
        backgroundSize: '200% 100%',
        opacity: 0.08,
        animation: 'gradient-flow 1.5s ease infinite 0.2s',
      }}
    />
  </div>
);
