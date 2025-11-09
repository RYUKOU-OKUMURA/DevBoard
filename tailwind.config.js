/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'surface-app': 'var(--bg-app)',
        'surface-primary': 'var(--bg-primary)',
        'surface-secondary': 'var(--bg-secondary)',
        'surface-tertiary': 'var(--bg-tertiary)',
        'surface-muted': 'var(--bg-muted)',
        'surface-hover': 'var(--bg-hover)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': 'var(--text-inverse)',
        'accent-green': 'var(--accent-green)',
        'accent-green-strong': 'var(--accent-green-emphasis)',
        'accent-green-muted': 'var(--accent-green-muted)',
        'accent-green-border': 'var(--accent-green-border)',
        'accent-blue': 'var(--accent-blue)',
        'accent-blue-strong': 'var(--accent-blue-emphasis)',
        'accent-blue-muted': 'var(--accent-blue-muted)',
        'accent-blue-border': 'var(--accent-blue-border)',
        'accent-purple': 'var(--accent-purple)',
        'accent-purple-strong': 'var(--accent-purple-emphasis)',
        'accent-purple-muted': 'var(--accent-purple-muted)',
        'accent-purple-border': 'var(--accent-purple-border)',
        'accent-yellow': 'var(--accent-yellow)',
        'accent-yellow-strong': 'var(--accent-yellow-emphasis)',
        'accent-yellow-muted': 'var(--accent-yellow-muted)',
        'accent-yellow-border': 'var(--accent-yellow-border)',
        'accent-orange': 'var(--accent-orange)',
        'accent-orange-strong': 'var(--accent-orange-emphasis)',
        'accent-orange-muted': 'var(--accent-orange-muted)',
        'accent-orange-border': 'var(--accent-orange-border)',
        'accent-red': 'var(--accent-red)',
        'accent-red-strong': 'var(--accent-red-emphasis)',
        'accent-red-muted': 'var(--accent-red-muted)',
        'accent-red-border': 'var(--accent-red-border)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      // 8pxグリッドに基づくスペーシングシステム
      spacing: {
        '0.5': '0.125rem',   // 2px
        '1': '0.25rem',       // 4px
        '1.5': '0.375rem',    // 6px
        '2': '0.5rem',        // 8px
        '3': '0.75rem',       // 12px
        '4': '1rem',          // 16px
        '6': '1.5rem',        // 24px
        '8': '2rem',          // 32px
        '12': '3rem',         // 48px
        '16': '4rem',         // 64px
        // Inset tokens (uniform padding/margin)
        'inset-xs': '0.5rem',  // 8px
        'inset-sm': '0.75rem', // 12px
        'inset-md': '1rem',    // 16px
        'inset-lg': '1.5rem',  // 24px
        'inset-xl': '2rem',    // 32px
        // Stack tokens (vertical rhythm)
        'stack-xs': '0.5rem',  // 8px
        'stack-sm': '1rem',    // 16px
        'stack-md': '1.5rem',  // 24px
        'stack-lg': '3rem',    // 48px
        'stack-xl': '4rem',    // 64px
        // Inline tokens (horizontal rhythm)
        'inline-xs': '0.25rem', // 4px
        'inline-sm': '0.5rem',  // 8px
        'inline-md': '0.75rem', // 12px
        'inline-lg': '1rem',    // 16px
      },
      // ボーダー半径の統一（3段階）
      borderRadius: {
        'lg': '0.5rem',   // 8px - 小さな要素、バッジ
        'xl': '0.75rem',  // 12px - カード、ボタン
        '2xl': '1rem',    // 16px - モーダル、大きなコンテナ
      },
      // タイポグラフィスケール
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],     // 14px
        'base': ['1rem', { lineHeight: '1.6' }],       // 16px
        'lg': ['1.125rem', { lineHeight: '1.5' }],     // 18px
        'xl': ['1.5rem', { lineHeight: '1.4' }],       // 24px
        '2xl': ['1.875rem', { lineHeight: '1.3' }],    // 30px
        '3xl': ['2.25rem', { lineHeight: '1.2' }],     // 36px
        // セマンティックフォントサイズ
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.04em' }], // 60px
        'display': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }],     // 48px
        'title-1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],   // 36px
        'title-2': ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],   // 28px
        'title-3': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0em' }],       // 20px
        'body': ['1rem', { lineHeight: '1.6', letterSpacing: '0em' }],            // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0em' }],     // 14px
        'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],   // 12px
        'label': ['0.875rem', { lineHeight: '1', letterSpacing: '0.4em' }],        // 14px
      },
      fontWeight: {
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      // トランジション設定
      transitionDuration: {
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
