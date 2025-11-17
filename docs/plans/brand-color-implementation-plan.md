# 🏆 DevBoard Apple級デザインシステム - 完全版実装プラン

## 📋 フィードバック対応サマリー

✅ **ビジュアルだけでなく構成・余白・タイポグラフィの一貫性を強化**
✅ **モーションガイド（速度・ディレイ・イージング）を明確化**
✅ **reduced motion・フォーカスリング・キーボード操作を全面対応**
✅ **チタン/メタリック質感を戦略的に導入**
✅ **「落ち着き」と「驚き」のバランスを各フェーズで検証**

---

## 🎨 拡張ブランドカラーシステム

### 基本カラー
- **#E53935 (Red)** - エネルギー、アクション、緊急性
- **#673AB7 (Purple)** - プレミアム、信頼、革新

### メタリックレイヤー
- **Titanium Shimmer** - 微細な光沢効果（白/黒の0.02-0.1透明度）
- **Brushed Metal Gradient** - 方向性のある質感
- **Anodized Edge** - エッジハイライト（inset shadow）

---

## 📐 Phase 0: 設計システム基盤強化（新規追加）

**目的**: ビジュアルエフェクトの前に、構造と一貫性を確立

### 0.1 タイポグラフィ階層の確立（2時間）

**現状の課題**:
- Displayサイズ未定義（48px+）
- セマンティック階層なし（h1/h2 vs display/title/body）
- Letter spacingが一部のみ適用

**実装内容**:

**ファイル**: `tailwind.config.js`, `designSystem.ts`

```javascript
// セマンティックタイプスケール
fontSize: {
  'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.04em' }],  // 60px - Hero
  'display': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }],       // 48px - Landing
  'title-1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],     // 36px - Page title
  'title-2': ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],     // 28px - Section
  'title-3': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0em' }],         // 20px - Subsection
  'body': ['1rem', { lineHeight: '1.6', letterSpacing: '0em' }],               // 16px - Default
  'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0em' }],        // 14px - Secondary
  'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],      // 12px - Metadata
  'label': ['0.875rem', { lineHeight: '1', letterSpacing: '0.4em' }],          // 14px - Uppercase
}
```

**適用ルール**:
- ランディングヒーロー: `text-display`
- ページタイトル: `text-title-1`
- カード見出し: `text-title-3`
- 本文: `text-body`
- バッジ/タイムスタンプ: `text-caption`
- ラベル: `text-label uppercase`

### 0.2 厳格な8pxグリッドシステム（1時間）

**現状の課題**:
- `p-5`（20px）、`px-2.5`（10px）などグリッド外の値
- セマンティック命名なし

**実装内容**:

**ファイル**: `tailwind.config.js`, `designSystem.ts`

```javascript
// セマンティックスペーシング
spacing: {
  // Inset（内部パディング）
  'inset-xs': '0.5rem',   // 8px - Tight elements
  'inset-sm': '0.75rem',  // 12px - Compact cards
  'inset-md': '1rem',     // 16px - Standard buttons
  'inset-lg': '1.5rem',   // 24px - Cards
  'inset-xl': '2rem',     // 32px - Large containers

  // Stack（垂直リズム）
  'stack-xs': '0.5rem',   // 8px - List items
  'stack-sm': '1rem',     // 16px - Paragraphs
  'stack-md': '1.5rem',   // 24px - Card groups
  'stack-lg': '3rem',     // 48px - Sections
  'stack-xl': '4rem',     // 64px - Page sections

  // Inline（水平間隔）
  'inline-xs': '0.25rem', // 4px - Icon gaps
  'inline-sm': '0.5rem',  // 8px - Tag spacing
  'inline-md': '0.75rem', // 12px - Button groups
  'inline-lg': '1rem',    // 16px - Nav items
}
```

**移行マップ**:
- `p-5` → `p-inset-lg` (20px → 24px)
- `px-2.5` → `px-inset-sm` (10px → 12px)
- `gap-3` → `gap-stack-xs` (12px → 8px または stack-sm 16px)

### 0.3 モーションデザインガイドライン（2時間）

**現状の課題**:
- コンポーネントの大半が`motion-reduce:`未対応
- タイミング・イージングが不統一

**実装内容**:

**ファイル**: `index.css`, `designSystem.ts`

```javascript
// モーショントークン
motion: {
  duration: {
    instant: '100ms',   // Checkbox、Toggle - 即座のフィードバック
    fast: '150ms',      // Hover effects - 視覚的応答
    normal: '250ms',    // Default transitions - バランス
    slow: '400ms',      // Page transitions - 落ち着き
    lazy: '600ms',      // Delightful details - 驚き
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',        // Most transitions
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',        // Entering (easeOut)
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',        // Exiting (easeIn)
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Playful bounce
  },
  stagger: {
    card: '50ms',       // カードエントランス遅延
    listItem: '30ms',   // リストアイテム遅延
  }
}
```

**標準パターン**:
```css
/* すべてのインタラクティブ要素 */
.interactive {
  transition-property: transform, opacity, background-color, border-color, box-shadow;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--easing-standard);
}

@media (prefers-reduced-motion: reduce) {
  .interactive {
    transition-duration: 0.01ms !important;
    animation: none !important;
  }
}

/* Hover状態 */
.interactive:hover {
  transform: translateY(-1px) scale(1.01);
  transition-duration: var(--duration-normal);
}

/* Active状態 */
.interactive:active {
  transform: scale(0.98);
  transition-duration: var(--duration-instant);
}
```

### 0.4 アクセシビリティ標準化（1.5時間）

**実装内容**:

**ファイル**: `tailwind.config.js`, 全コンポーネント

```javascript
// フォーカスリングプリセット
const focusRing = {
  default: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  brand: 'focus-visible:ring-brand-purple',
  danger: 'focus-visible:ring-brand-red',
}
```

**適用ルール**:
- すべての`<button>`: `${focusRing.default} ${focusRing.brand}`
- すべての`<input>`: `${focusRing.default} ${focusRing.brand}`
- 削除ボタン: `${focusRing.default} ${focusRing.danger}`
- カスタムインタラクティブ: `tabIndex={0}`, `role="button"`, フォーカスリング

**ARIA追加**:
- ドロップダウン: `aria-expanded`, `aria-haspopup`
- タブナビゲーション: `aria-selected`, `role="tablist"`
- ライブリージョン: `aria-live="polite"`（ステータス更新）

---

## 🎨 Phase 1: ブランドカラー+メタリック基盤（3-4時間）

### 1.1 CSS変数定義（1時間）

**ファイル**: `src/index.css`

```css
:root {
  /* ========== BRAND COLORS ========== */
  /* Red */
  --brand-red: #E53935;
  --brand-red-emphasis: #C62828;
  --brand-red-soft: rgba(229, 57, 53, 0.15);
  --brand-red-muted: rgba(229, 57, 53, 0.12);
  --brand-red-border: rgba(229, 57, 53, 0.24);
  --brand-red-glow: rgba(229, 57, 53, 0.5);

  /* Purple */
  --brand-purple: #673AB7;
  --brand-purple-emphasis: #512DA8;
  --brand-purple-soft: rgba(103, 58, 183, 0.15);
  --brand-purple-muted: rgba(103, 58, 183, 0.12);
  --brand-purple-border: rgba(103, 58, 183, 0.24);
  --brand-purple-glow: rgba(103, 58, 183, 0.5);

  /* Gradients */
  --brand-gradient: linear-gradient(135deg, #E53935 0%, #673AB7 100%);
  --brand-gradient-reverse: linear-gradient(135deg, #673AB7 0%, #E53935 100%);
  --brand-gradient-mesh: linear-gradient(135deg,
    #E53935 0%, #D81B60 25%, #8E24AA 50%, #673AB7 75%, #5E35B1 100%);

  /* ========== METALLIC EFFECTS ========== */
  /* Titanium - Light Mode */
  --metallic-highlight: rgba(255, 255, 255, 0.1);
  --metallic-shimmer: rgba(255, 255, 255, 0.05);
  --metallic-edge-top: rgba(255, 255, 255, 0.2);
  --metallic-edge-bottom: rgba(0, 0, 0, 0.1);
  --metallic-noise: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.02) 0%, transparent 50%);

  /* Brushed Metal Gradient */
  --brushed-metal: linear-gradient(135deg,
    hsl(240, 10%, 98%) 0%,
    hsl(240, 10%, 96%) 50%,
    hsl(240, 10%, 94%) 100%);
}

.dark {
  /* Purple - Lighter for dark mode */
  --brand-purple: #8B6FDB;
  --brand-purple-emphasis: #7C5FCC;

  /* Red - Lighter for dark mode */
  --brand-red: #FF6B68;
  --brand-red-emphasis: #F44336;

  /* Metallic - Dark Mode */
  --metallic-highlight: rgba(255, 255, 255, 0.08);
  --metallic-shimmer: rgba(255, 255, 255, 0.03);
  --metallic-edge-top: rgba(255, 255, 255, 0.15);
  --metallic-edge-bottom: rgba(0, 0, 0, 0.2);

  --brushed-metal: linear-gradient(135deg,
    hsl(240, 15%, 12%) 0%,
    hsl(240, 15%, 10%) 50%,
    hsl(240, 15%, 8%) 100%);
}
```

### 1.2 アニメーションキーフレーム（1時間）

**ファイル**: `src/index.css`

```css
/* ========== GRADIENT ANIMATIONS ========== */
@keyframes gradient-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes gradient-pulse {
  0%, 100% {
    background-position: 0% 50%;
    opacity: 1;
  }
  50% {
    background-position: 100% 50%;
    opacity: 0.9;
  }
}

/* ========== METALLIC ANIMATIONS ========== */
@keyframes metallic-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes metallic-glow {
  0%, 100% {
    box-shadow:
      0 0 20px var(--brand-purple-glow),
      inset 0 1px 0 var(--metallic-edge-top);
  }
  50% {
    box-shadow:
      0 0 40px var(--brand-red-glow),
      inset 0 1px 0 var(--metallic-edge-top);
  }
}

@keyframes float-gentle {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}

/* ========== ENTRANCE ANIMATIONS ========== */
@keyframes card-entrance {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes color-bloom {
  0% {
    box-shadow: 0 0 0 0 var(--brand-purple-glow);
  }
  50% {
    box-shadow: 0 0 20px 10px var(--brand-purple-glow);
  }
  100% {
    box-shadow: 0 0 0 0 var(--brand-purple-glow);
  }
}
```

### 1.3 デザインシステム更新（1時間）

**ファイル**: `src/lib/designSystem.ts`

```typescript
export interface DesignPalette {
  // 既存のプロパティ...

  // Brand colors
  brandRed: string;
  brandRedEmphasis: string;
  brandRedSoft: string;
  brandRedGlow: string;
  brandPurple: string;
  brandPurpleEmphasis: string;
  brandPurpleSoft: string;
  brandPurpleGlow: string;
  brandGradient: string;

  // Metallic effects
  metallicHighlight: string;
  metallicShimmer: string;
  brushedMetal: string;
}

// createDesignPalette()関数を更新して上記を返す
```

### 1.4 Tailwind設定（1時間）

**ファイル**: `tailwind.config.js`

```javascript
colors: {
  'brand-red': 'var(--brand-red)',
  'brand-red-emphasis': 'var(--brand-red-emphasis)',
  'brand-red-soft': 'var(--brand-red-soft)',
  'brand-purple': 'var(--brand-purple)',
  'brand-purple-emphasis': 'var(--brand-purple-emphasis)',
  'brand-purple-soft': 'var(--brand-purple-soft)',
}
```

---

## 🌟 Phase 2: ランディングページ - 第一印象の革命（5-6時間）

**目標**: "Wow, this is Apple-level" という反応を引き出す

### 2.1 ヒーローセクション背景（1.5時間）

**ファイル**: `LandingPage.tsx`

**実装**:
```tsx
<div className="relative overflow-hidden">
  {/* Animated Mesh Gradient Background */}
  <div
    className="absolute inset-0 opacity-40"
    style={{
      background: 'var(--brand-gradient-mesh)',
      backgroundSize: '200% 200%',
      animation: 'gradient-flow 8s ease infinite'
    }}
  />

  {/* Metallic Noise Overlay */}
  <div
    className="absolute inset-0 opacity-30"
    style={{ backgroundImage: 'var(--metallic-noise)' }}
  />

  {/* Floating Geometric Shapes */}
  <div className="absolute top-20 left-10 w-64 h-64 bg-brand-purple-soft rounded-full blur-3xl animate-float-gentle" />
  <div className="absolute bottom-20 right-10 w-80 h-80 bg-brand-red-soft rounded-full blur-3xl animate-float-gentle" style={{ animationDelay: '2s' }} />
</div>
```

**モーション検証**: reduced motionでグラデーションアニメーション停止

### 2.2 メインヘッドライン（1時間）

```tsx
<h1
  className="text-display-lg font-bold mb-stack-md motion-reduce:animate-none"
  style={{
    background: 'var(--brand-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'gradient-pulse 3s ease-in-out infinite',
    backgroundSize: '200% auto'
  }}
>
  リポジトリ管理を、簡単に・直感的に。
</h1>
```

### 2.3 CTAボタン - メタリック+グラデーション（2時間）

**プレミアムボタンコンポーネント作成**:

```tsx
// src/components/ui/PremiumButton.tsx
export const PremiumButton = ({ children, ...props }) => (
  <motion.button
    className="relative px-inset-xl py-inset-md rounded-xl text-body font-semibold text-white overflow-hidden group"
    style={{
      background: 'var(--brand-gradient)',
      backgroundSize: '200% 100%',
      boxShadow: `
        0 4px 20px var(--brand-red-glow),
        inset 0 1px 0 var(--metallic-edge-top),
        inset 0 -1px 0 var(--metallic-edge-bottom)
      `
    }}
    whileHover={{
      backgroundPosition: '100% 0',
      scale: 1.02,
      y: -2
    }}
    whileTap={{ scale: 0.98 }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }}
    {...props}
  >
    {/* Metallic Shimmer Effect */}
    <span
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, var(--metallic-highlight) 50%, transparent 100%)',
        animation: 'metallic-shimmer 2s ease-in-out infinite'
      }}
    />

    {/* Content */}
    <span className="relative z-10">{children}</span>

    {/* Glow Pulse */}
    <span
      className="absolute inset-0 -z-10 rounded-xl blur-xl opacity-60"
      style={{
        background: 'var(--brand-gradient)',
        animation: 'metallic-glow 3s ease-in-out infinite'
      }}
    />
  </motion.button>
);
```

**感情チェック**: 「触りたくなる」「高級感がある」「Appleっぽい」

### 2.4 フィーチャーカード（1.5時間）

```tsx
<motion.div
  className="bg-surface p-inset-lg rounded-2xl relative overflow-hidden group"
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.4,
    delay: index * 0.05,  // Staggered entrance
    ease: [0, 0, 0.2, 1]  // decelerate
  }}
  viewport={{ once: true, margin: "-100px" }}
  whileHover={{ y: -4, transition: { duration: 0.25 } }}
>
  {/* Gradient Border on Hover */}
  <div
    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    style={{
      background: 'var(--brand-gradient)',
      padding: '2px',
      borderRadius: 'inherit',
      zIndex: -1
    }}
  >
    <div className="w-full h-full bg-surface rounded-2xl" />
  </div>

  {/* Metallic Noise */}
  <div
    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    style={{ backgroundImage: 'var(--metallic-noise)' }}
  />

  {/* Color Bloom Effect */}
  <div className="absolute -inset-4 opacity-0 group-hover:opacity-100">
    <div
      className="w-full h-full"
      style={{ animation: 'color-bloom 1s ease-out' }}
    />
  </div>

  {/* Content */}
  <div className="relative z-10">
    {/* ... カード内容 ... */}
  </div>
</motion.div>
```

**バランス検証**:
- 静止時: 落ち着いた高級感
- ホバー時: 驚きと喜び（過剰にならない）

---

## 🎯 Phase 3: コアUI - 日常の喜び（7-8時間）

### 3.1 Framer Motionインストール（15分）

```bash
npm install framer-motion
```

### 3.2 RepoCard再設計（2.5時間）

**ファイル**: `src/components/RepoCard.tsx`

```tsx
import { motion } from 'framer-motion';

export const RepoCard = ({ repo }) => (
  <motion.div
    layout  // Layout animations
    className="relative bg-surface rounded-xl p-inset-lg group"
    style={{
      boxShadow: '0 2px 8px -2px rgb(15 23 42 / 0.08)',
    }}
    whileHover={{
      y: -4,
      boxShadow: `
        0 12px 40px ${repo.isActive ? 'var(--brand-red-soft)' : 'var(--brand-purple-soft)'},
        0 6px 20px rgba(0,0,0,0.1)
      `,
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
    }}
    whileTap={{ scale: 0.98 }}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
  >
    {/* Gradient Accent Bar (top) */}
    <div
      className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{
        background: repo.columnKey === 'Active'
          ? 'var(--brand-red)'
          : 'var(--brand-gradient)'
      }}
    />

    {/* Metallic Brushed Background (on hover) */}
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-xl"
      style={{ background: 'var(--brushed-metal)' }}
    />

    {/* Content */}
    <div className="relative z-10">
      {/* ... existing content ... */}
    </div>

    {/* Focus Ring (keyboard navigation) */}
    <div className="absolute inset-0 rounded-xl ring-2 ring-brand-purple ring-offset-2 opacity-0 focus-visible:opacity-100 transition-opacity" />
  </motion.div>
);
```

**アクセシビリティ**:
- `tabIndex={0}`, `role="button"`
- `focus-visible`でリング表示
- キーボード操作でホバー効果

### 3.3 TopBar洗練（2時間）

**ファイル**: `src/components/TopBar.tsx`

**検索インプット**:
```tsx
<input
  className="
    px-inset-md py-inset-sm rounded-xl
    bg-surface border border-border
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-brand-purple
    focus-visible:border-brand-purple
    transition-all duration-150
    motion-reduce:transition-none
  "
  style={{
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
  }}
/>
```

**アクションボタン（グラデーション）**:
```tsx
{/* Primary Action (Refresh) */}
<motion.button
  className="px-inset-md py-inset-sm rounded-xl text-white font-medium"
  style={{
    background: 'var(--brand-gradient)',
    backgroundSize: '200% 100%',
    boxShadow: 'inset 0 1px 0 var(--metallic-edge-top)'
  }}
  whileHover={{
    backgroundPosition: '100% 0',
    boxShadow: '0 4px 12px var(--brand-purple-glow), inset 0 1px 0 var(--metallic-edge-top)'
  }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.15 }}
>
  Refresh
</motion.button>
```

### 3.4 モーダルシステム（グラスモーフィズム）（2時間）

**新規コンポーネント**: `src/components/ui/GlassModal.tsx`

```tsx
import { motion, AnimatePresence } from 'framer-motion';

export const GlassModal = ({ isOpen, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 z-50"
          style={{
            backgroundColor: 'rgba(103, 58, 183, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        />

        {/* Modal Content */}
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
        >
          <div
            className="relative bg-surface rounded-2xl p-inset-xl max-w-md w-full"
            style={{
              backgroundColor: 'rgba(var(--bg-primary-rgb), 0.95)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '2px solid transparent',
              backgroundImage: `
                linear-gradient(var(--bg-surface), var(--bg-surface)),
                var(--brand-gradient)
              `,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: `
                0 20px 60px rgba(0,0,0,0.3),
                inset 0 1px 0 var(--metallic-edge-top)
              `
            }}
          >
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
```

### 3.5 TabNavigation強化（1.5時間）

```tsx
<div className="flex gap-inline-md border-b border-border">
  {tabs.map((tab, index) => (
    <motion.button
      key={tab.id}
      className={`
        relative px-inset-md py-inset-sm text-body-sm font-medium
        ${active === tab.id ? 'text-brand-purple' : 'text-muted'}
      `}
      onClick={() => setActive(tab.id)}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {tab.label}

      {/* Animated Gradient Underline */}
      {active === tab.id && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: 'var(--brand-gradient)' }}
          layoutId="activeTab"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        />
      )}

      {/* Badge with Gradient */}
      {tab.count > 0 && (
        <span
          className="ml-inline-xs px-2 py-0.5 rounded-lg text-caption text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          {tab.count}
        </span>
      )}
    </motion.button>
  ))}
</div>
```

---

## ✨ Phase 4: マイクロインタラクション - 細部への執着（4-5時間）

### 4.1 ドラッグ&ドロップ強化（2時間）

**ファイル**: `RepoCard.tsx`, `RepoColumn.tsx`

```tsx
// Framer Motion drag props
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.1}
  onDragStart={() => {
    // Add color trail effect
  }}
  onDragEnd={(event, info) => {
    // Magnetic snap with spring physics
  }}
  whileDrag={{
    scale: 1.05,
    boxShadow: `
      0 20px 60px var(--brand-purple-glow),
      0 10px 30px rgba(0,0,0,0.2)
    `,
    backgroundColor: 'rgba(var(--bg-surface-rgb), 0.8)',
    backdropFilter: 'blur(8px)',
    cursor: 'grabbing'
  }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
```

**ドロップゾーン（Purpleグロー）**:
```tsx
<motion.div
  className="border-2 border-dashed rounded-xl p-inset-md"
  animate={{
    borderColor: isOver ? 'var(--brand-purple)' : 'var(--border)',
    backgroundColor: isOver ? 'var(--brand-purple-soft)' : 'transparent',
    boxShadow: isOver ? '0 0 30px var(--brand-purple-glow)' : 'none'
  }}
  transition={{ duration: 0.2 }}
>
```

### 4.2 ローディング状態（グラデーションスケルトン）（1時間）

```tsx
// src/components/ui/SkeletonCard.tsx
export const SkeletonCard = () => (
  <div className="bg-surface rounded-xl p-inset-lg">
    <div
      className="h-6 rounded-lg mb-stack-xs"
      style={{
        background: 'var(--brand-gradient)',
        backgroundSize: '200% 100%',
        opacity: 0.1,
        animation: 'gradient-flow 1.5s ease infinite'
      }}
    />
    <div
      className="h-4 rounded-lg w-3/4"
      style={{
        background: 'var(--brand-gradient)',
        backgroundSize: '200% 100%',
        opacity: 0.08,
        animation: 'gradient-flow 1.5s ease infinite 0.2s'
      }}
    />
  </div>
);
```

### 4.3 通知システム（Dynamic Islandスタイル）（1.5時間）

```tsx
// src/components/ui/Toast.tsx
import { motion, AnimatePresence } from 'framer-motion';

export const Toast = ({ message, type }) => (
  <AnimatePresence>
    <motion.div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div
        className="px-inset-lg py-inset-sm rounded-full text-white font-medium shadow-2xl"
        style={{
          background: type === 'success' ? 'var(--brand-gradient)' : 'var(--brand-red)',
          backdropFilter: 'blur(8px)',
          boxShadow: `
            0 8px 32px ${type === 'success' ? 'var(--brand-purple-glow)' : 'var(--brand-red-glow)'},
            inset 0 1px 0 var(--metallic-edge-top)
          `
        }}
      >
        {message}
      </div>
    </motion.div>
  </AnimatePresence>
);
```

---

## 🎭 各フェーズでのバランス検証

### チェックポイント

**Phase 2完了時**:
- [ ] ヒーロー背景のアニメーションが8秒で自然か？
- [ ] CTAボタンが「触りたい」と思わせるか？
- [ ] メタリック質感が過剰でないか？
- [ ] reduced motionで適切に静止するか?

**Phase 3完了時**:
- [ ] カードホバーが250msで心地よいか？
- [ ] グローエフェクトが派手すぎないか？
- [ ] フォーカスリングが明確に見えるか（WCAG AA）？
- [ ] キーボード操作が滑らかか？

**Phase 4完了時**:
- [ ] ドラッグ操作がスプリングで自然か？
- [ ] 通知が邪魔にならないか？
- [ ] ローディングが楽しいか、イライラしないか？

### 「落ち着き」と「驚き」のバランス

**落ち着き（80%）**:
- タイポグラフィ階層の一貫性
- 8pxグリッドの厳格な適用
- 予測可能なモーション（standard easing）
- 高コントラストのアクセシビリティ

**驚き（20%）**:
- ヒーローグラデーションの流動
- CTAボタンのメタリックシマー
- カードホバーのグロー
- ドラッグ時のカラートレイル

**Apple哲学**: 「ほとんどの時間は静かで落ち着いている。触った瞬間だけ、魔法が起きる」

---

## 📊 成功指標

### ビジュアル品質
- **タイポグラフィ一貫性**: 100%（すべてセマンティックスケール使用）
- **グリッド準拠**: 100%（8px外の値ゼロ）
- **モーション対応**: 100%（すべての遷移にmotion-reduce）
- **メタリック質感**: 戦略的（CTAボタン、カードホバー、モーダル）

### アクセシビリティ
- **WCAG AA**: 100%（コントラスト比4.5:1以上）
- **フォーカスリング**: 100%（すべてのインタラクティブ要素）
- **ARIA属性**: 完全（ドロップダウン、タブ、ライブリージョン）
- **キーボード操作**: 完全（Tab、Enter、Escape、Arrow）

### 感情的インパクト
- **第一印象**: "Wow, Apple級"
- **日常使用**: "使うたびに嬉しい"
- **ブランド認知**: "この色＝DevBoard"

---

## 📁 変更ファイルサマリー

### 設定ファイル（3ファイル）
- `tailwind.config.js` - タイポグラフィ、スペーシング、カラー拡張
- `src/index.css` - CSS変数、キーフレーム、メタリック定義
- `src/lib/designSystem.ts` - TypeScript型、パレット更新

### 新規コンポーネント（4ファイル）
- `src/components/ui/PremiumButton.tsx` - メタリックグラデーションボタン
- `src/components/ui/GlassModal.tsx` - グラスモーフィズムモーダル
- `src/components/ui/Toast.tsx` - Dynamic Island通知
- `src/components/ui/SkeletonCard.tsx` - グラデーションスケルトン

### 更新コンポーネント（推定6-8ファイル）
- `LandingPage.tsx` - ヒーロー、CTA、フィーチャーカード
- `RepoCard.tsx` - メタリック、グロー、ドラッグ
- `RepoColumn.tsx` - ドロップゾーン
- `TopBar.tsx` - 検索、ボタン
- `TabNavigation.tsx` - グラデーション下線
- その他（フォーカスリング、motion-reduce追加）

### 新規ドキュメント（1ファイル）
- `docs/design/design-system-guidelines.md` - タイポグラフィ、スペーシング、モーションガイドライン

---

## ⏱️ 推定作業時間

- **Phase 0**: 6.5時間（基盤強化）
- **Phase 1**: 4時間（カラー+メタリック基盤）
- **Phase 2**: 6時間（ランディングページ）
- **Phase 3**: 8時間（コアUI）
- **Phase 4**: 5時間（マイクロインタラクション）

**合計**: 29.5時間（約4日間）

---

## 🚀 実装完了後の期待成果

このプランで、DevBoardは：
- ✅ Apple級のビジュアル洗練度（9.5/10）
- ✅ 一貫したタイポグラフィとスペーシング
- ✅ 完全なアクセシビリティ対応
- ✅ **チタン/メタリック質感による高級感**
- ✅ 「落ち着き」と「驚き」の完璧なバランス
- ✅ 世界を獲る準備完了
