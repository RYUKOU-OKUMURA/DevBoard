import { useMemo } from 'react';

/**
 * Design System for DevBoard
 *
 * This module provides a centralized design system that leverages CSS variables
 * defined in index.css and provides type-safe access to design tokens.
 */

// ============================================================================
// Color Palette Interface
// ============================================================================

export interface DesignPalette {
  // Landing page specific colors
  background: string;
  hero: string;
  heroBorder: string;
  textPrimary: string;
  textMuted: string;
  featureBg: string;
  featureBorder: string;
  highlight: string;
  accent: string;
  accentGlow: string;
  accentGradient: string;
  callToActionText: string;
  callToActionShadow: string;

  // Aside section colors
  asideBg: string;
  asideBorder: string;
  asideHighlight: string;
}

// ============================================================================
// Design Tokens Interface
// ============================================================================

export interface DesignTokens {
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    hero: string;
    aside: string;
    cta: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      xxl: string;
      xxxl: string;
      xxxxl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
    letterSpacing: {
      normal: string;
      wide: string;
      wider: string;
      widest: string;
    };
  };
  transitions: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    timing: {
      easeInOut: string;
      easeOut: string;
      easeIn: string;
    };
  };
}

// ============================================================================
// Palette Generation Function
// ============================================================================

/**
 * Creates a design palette based on the current theme mode
 * @param isDark - Whether dark mode is enabled
 * @returns DesignPalette object with theme-appropriate colors
 */
export function createDesignPalette(isDark: boolean): DesignPalette {
  return {
    // Background gradients
    background: isDark
      ? 'linear-gradient(180deg, #05070f 0%, #0a1224 45%, #060712 100%)'
      : 'linear-gradient(180deg, #f6f2ff 0%, #ede4ff 55%, #eef2ff 100%)',

    // Hero section
    hero: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
    heroBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(81, 45, 168, 0.2)',

    // Text colors
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? 'rgba(248, 250, 252, 0.78)' : 'rgba(15, 23, 42, 0.7)',

    // Feature cards
    featureBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.8)',
    featureBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.18)',

    // Accent colors (from CSS variables)
    highlight: 'var(--color-1-soft)',
    accent: 'var(--color-1)',
    accentGlow: 'var(--color-1-glow)',
    accentGradient: 'linear-gradient(135deg, var(--color-1), #7c4dff)',

    // Call to action button
    callToActionText: '#ffffff',
    callToActionShadow: isDark
      ? '0 22px 45px rgba(108, 99, 255, 0.35)'
      : '0 22px 45px rgba(81, 45, 168, 0.35)',

    // Aside section
    asideBg: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)',
    asideBorder: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(148, 163, 184, 0.2)',
    asideHighlight: isDark ? 'rgba(81, 45, 168, 0.08)' : 'rgba(81, 45, 168, 0.08)',
  };
}

// ============================================================================
// Design Tokens
// ============================================================================

export const designTokens: DesignTokens = {
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    xxl: '2.5rem',  // 40px
  },
  borderRadius: {
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px
    lg: '1rem',     // 16px
    xl: '1.5rem',   // 24px
    xxl: '2rem',    // 32px
    full: '9999px',
  },
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    hero: '0 25px 60px rgba(15, 23, 42, 0.25)',
    aside: '0 20px 45px rgba(15, 23, 42, 0.18)',
    cta: '0 22px 45px rgba(81, 45, 168, 0.35)',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      xxl: '1.5rem',    // 24px
      xxxl: '2rem',     // 32px
      xxxxl: '2.5rem',  // 40px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.3,
      normal: 1.5,
      relaxed: 1.6,
    },
    letterSpacing: {
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.4em',
    },
  },
  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    timing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
};

// ============================================================================
// Component Preset Styles
// ============================================================================

export function createComponentStyles(palette: DesignPalette, tokens: DesignTokens) {
  return {
    // Hero section wrapper
    heroSection: {
      background: palette.hero,
      borderColor: palette.heroBorder,
      boxShadow: tokens.shadows.hero,
    },

    // Feature card
    featureCard: {
      background: palette.featureBg,
      borderColor: palette.featureBorder,
      transition: `transform ${tokens.transitions.duration.normal} ${tokens.transitions.timing.easeInOut}`,
    },

    // Aside section
    asideSection: {
      background: palette.asideBg,
      borderColor: palette.asideBorder,
      boxShadow: tokens.shadows.aside,
    },

    // CTA button
    ctaButton: {
      background: palette.accentGradient,
      color: palette.callToActionText,
      boxShadow: palette.callToActionShadow,
      transition: `transform ${tokens.transitions.duration.normal} ${tokens.transitions.timing.easeInOut}`,
    },

    // Use case number badge
    useCaseBadge: {
      background: palette.highlight,
      color: palette.accent,
    },

    // Future features box
    futureBox: {
      borderColor: palette.accentGlow,
      background: palette.asideHighlight,
    },
  };
}

// ============================================================================
// Aura Gradient Generator
// ============================================================================

/**
 * Creates an aura gradient effect for backgrounds
 * @param palette - The design palette
 * @param isDark - Whether dark mode is enabled
 * @returns CSS gradient string
 */
export function createAuraGradient(palette: DesignPalette, isDark: boolean): string {
  return isDark
    ? `radial-gradient(circle at 15% -10%, ${palette.highlight}, transparent 40%), radial-gradient(circle at 90% 5%, ${palette.accentGlow}, transparent 50%)`
    : `radial-gradient(circle at 20% -5%, ${palette.highlight}, transparent 45%), radial-gradient(circle at 70% -10%, ${palette.accentGlow}, transparent 55%)`;
}

// ============================================================================
// Main Hook: useDesignSystem
// ============================================================================

/**
 * Custom hook that provides the complete design system
 * @param isDark - Whether dark mode is enabled
 * @returns Object containing palette, tokens, component styles, and utilities
 */
export function useDesignSystem(isDark: boolean) {
  const palette = useMemo(() => createDesignPalette(isDark), [isDark]);
  const componentStyles = useMemo(() => createComponentStyles(palette, designTokens), [palette]);
  const auraGradient = useMemo(() => createAuraGradient(palette, isDark), [palette, isDark]);

  return {
    palette,
    tokens: designTokens,
    componentStyles,
    auraGradient,
  };
}
