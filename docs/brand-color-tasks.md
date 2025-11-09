# DevBoard ブランドカラー実装 - 詳細タスクリスト

このドキュメントは、Apple級デザインシステム実装プランを具体的なタスクに細分化したものです。

---

## Phase 0: 設計システム基盤強化（6.5時間）

### 0.1 タイポグラフィ階層の確立（2時間）

-#### タスク 0.1.1: Tailwind Config にセマンティックフォントサイズを追加（30分）
- [x] `tailwind.config.js` を開く
- [x] `fontSize` オブジェクトに以下を追加:
  - `display-lg`: 60px, lineHeight 1.1, letterSpacing -0.04em
  - `display`: 48px, lineHeight 1.15, letterSpacing -0.03em
  - `title-1`: 36px, lineHeight 1.2, letterSpacing -0.02em
  - `title-2`: 28px, lineHeight 1.3, letterSpacing -0.01em
  - `title-3`: 20px, lineHeight 1.4, letterSpacing 0em
  - `body`: 16px, lineHeight 1.6, letterSpacing 0em
  - `body-sm`: 14px, lineHeight 1.5, letterSpacing 0em
  - `caption`: 12px, lineHeight 1.4, letterSpacing 0.02em
  - `label`: 14px, lineHeight 1, letterSpacing 0.4em
- [x] ファイルを保存

#### タスク 0.1.2: Design System にタイポグラフィトークンを追加（30分）
- [x] `src/lib/designSystem.ts` を開く
- [x] `DesignPalette` インターフェースに `typography` セクションを追加
- [x] `createDesignPalette()` 関数を更新してタイポグラフィ値を返す
- [x] TypeScript エラーがないことを確認

#### タスク 0.1.3: LandingPage でセマンティックフォントを適用（30分）
- [x] `src/components/LandingPage.tsx` を開く
- [x] ヒーロー見出しを `text-display` に変更
- [x] セクション見出しを `text-title-1` または `text-title-2` に変更
- [x] 本文を `text-body` に変更
- [x] メタデータ/タイムスタンプを `text-caption` に変更
- [x] ビジュアル確認（ブラウザでチェック）

#### タスク 0.1.4: 他のコンポーネントでフォントを標準化（30分）
- [x] `RepoCard.tsx`: カードタイトルを `text-title-3` に
- [x] `TopBar.tsx`: ボタンテキストを `text-body-sm` に
- [x] `TabNavigation.tsx`: タブラベルを `text-body-sm` に
- [x] 全体的な一貫性をビジュアル確認

---

### 0.2 厳格な8pxグリッドシステム（1時間）

#### タスク 0.2.1: Tailwind Config にセマンティックスペーシングを追加（20分）
- [x] `tailwind.config.js` を開く
- [x] `spacing` オブジェクトに以下を追加:
  - **Inset**: `inset-xs` (8px), `inset-sm` (12px), `inset-md` (16px), `inset-lg` (24px), `inset-xl` (32px)
  - **Stack**: `stack-xs` (8px), `stack-sm` (16px), `stack-md` (24px), `stack-lg` (48px), `stack-xl` (64px)
  - **Inline**: `inline-xs` (4px), `inline-sm` (8px), `inline-md` (12px), `inline-lg` (16px)
- [x] ファイルを保存

#### タスク 0.2.2: グリッド外の値を監査（15分）
- [x] プロジェクト全体で `p-5`, `px-2.5`, `py-2.5` などを検索
- [x] リスト作成（どのファイルのどの行にあるか）
- [x] 移行計画を決定（例: `p-5` → `p-inset-lg`）

#### タスク 0.2.3: RepoCard でスペーシングを移行（15分）
- [x] `src/components/RepoCard.tsx` を開く
- [x] `p-5` → `p-inset-lg` に変更
- [x] `gap-3` → `gap-stack-xs` または `gap-stack-sm` に変更
- [x] `mb-2`, `mb-3` などを `mb-stack-xs`, `mb-stack-sm` に変更
- [x] ビジュアル確認

#### タスク 0.2.4: TopBar でスペーシングを移行（10分）
- [x] `src/components/TopBar.tsx` を開く
- [x] パディング/マージンをセマンティックトークンに置き換え
- [x] ボタングループの `gap` を `gap-inline-md` に
- [x] ビジュアル確認

---

### 0.3 モーションデザインガイドライン（2時間）

-#### タスク 0.3.1: CSS にモーショントークン変数を追加（30分）
- [x] `src/index.css` を開く
- [x] `:root` セクションに以下を追加:
  ```css
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-lazy: 600ms;

  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --easing-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --easing-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  ```
- [x] ファイルを保存

-#### タスク 0.3.2: Design System にモーショントークンを追加（20分）
- [x] `src/lib/designSystem.ts` を開く
- [x] `transitions` オブジェクトを拡張:
  - `duration`: instant/fast/normal/slow/lazy
  - `easing`: standard/decelerate/accelerate/spring
  - `stagger`: card (50ms), listItem (30ms)
- [x] TypeScript 型を更新

#### タスク 0.3.3: すべてのコンポーネントに motion-reduce を追加（1時間）
- [x] `RepoCard.tsx`: すべての `transition-*` に `motion-reduce:transition-none` 追加
- [x] `TopBar.tsx`: ボタンホバー/アクティブ状態に `motion-reduce` 追加
- [x] `LandingPage.tsx`: アニメーションに `motion-reduce:animate-none` 追加
- [x] `TabNavigation.tsx`: タブ切り替えに `motion-reduce` 追加
- [x] `RepoColumn.tsx`: カードエントランスに `motion-reduce` 追加
- [x] ブラウザ設定で `prefers-reduced-motion` をテスト

#### タスク 0.3.4: 標準トランジションパターンをドキュメント化（10分）
- [x] `docs/design-system-guidelines.md` 作成
- [x] ホバー、アクティブ、フォーカス状態の標準パターンを記述
- [x] コード例を追加

---

### 0.4 アクセシビリティ標準化（1.5時間）

#### タスク 0.4.1: フォーカスリングユーティリティを作成（20分）
- [x] `src/lib/focusRing.ts` を作成
- [x] 以下のプリセットを定義:
-  ```ts
-  export const focusRing = {
-    default: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]',
-    brand: 'focus-visible:ring-[var(--accent-purple)]',
-    danger: 'focus-visible:ring-[var(--accent-red)]',
-  };
-  ```
- [x] エクスポート

#### タスク 0.4.2: すべてのボタンにフォーカスリングを適用（30分）
- [x] `TopBar.tsx`: すべての `<button>` に `focusRing` クラスを追加
- [x] `RepoCard.tsx`: カード要素に `focus-visible:ring-*` 追加
- [x] `LandingPage.tsx`: CTAボタンにフォーカスリング追加
- [x] キーボードで Tab キーを使ってテスト

#### タスク 0.4.3: すべての入力にフォーカスリングを適用（20分）
- [x] `TopBar.tsx`: 検索入力に `focus-visible:ring-[var(--accent-green)]` 追加
- [x] モーダル内の入力フィールドにフォーカスリング追加
- [x] キーボードナビゲーションをテスト

#### タスク 0.4.4: ARIA属性を追加（40分）
- [x] `TopBar.tsx`:
  - [x] ドロップダウンに `aria-expanded`, `aria-haspopup` 追加
  - [x] 検索に `aria-label="リポジトリを検索"` 追加
- [x] `TabNavigation.tsx`:
  - [x] `role="tablist"` をコンテナに追加
  - [x] 各タブに `role="tab"`, `aria-selected`, `tabIndex` 追加
- [x] `RepoBoard.tsx`:
  - [x] ステータス更新に `aria-live="polite"` 追加
- [x] スクリーンリーダーでテスト（macOS VoiceOver）

---

## Phase 1: ブランドカラー+メタリック基盤（3-4時間）

### 1.1 CSS変数定義（1時間）

#### タスク 1.1.1: ブランドカラー変数を追加（20分）
- [ ] `src/index.css` を開く
- [ ] `:root` セクションに以下を追加:
  ```css
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
  ```

#### タスク 1.1.2: グラデーション変数を追加（15分）
- [ ] 同じく `:root` に以下を追加:
  ```css
  --brand-gradient: linear-gradient(135deg, #E53935 0%, #673AB7 100%);
  --brand-gradient-reverse: linear-gradient(135deg, #673AB7 0%, #E53935 100%);
  --brand-gradient-mesh: linear-gradient(135deg,
    #E53935 0%, #D81B60 25%, #8E24AA 50%, #673AB7 75%, #5E35B1 100%);
  ```

#### タスク 1.1.3: メタリック変数を追加（Light Mode）（15分）
- [ ] `:root` に以下を追加:
  ```css
  --metallic-highlight: rgba(255, 255, 255, 0.1);
  --metallic-shimmer: rgba(255, 255, 255, 0.05);
  --metallic-edge-top: rgba(255, 255, 255, 0.2);
  --metallic-edge-bottom: rgba(0, 0, 0, 0.1);
  --metallic-noise: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.02) 0%, transparent 50%);
  --brushed-metal: linear-gradient(135deg,
    hsl(240, 10%, 98%) 0%,
    hsl(240, 10%, 96%) 50%,
    hsl(240, 10%, 94%) 100%);
  ```

#### タスク 1.1.4: ダークモード用の変数を追加（10分）
- [ ] `.dark` セクションに以下を追加:
  ```css
  --brand-purple: #8B6FDB;
  --brand-purple-emphasis: #7C5FCC;
  --brand-red: #FF6B68;
  --brand-red-emphasis: #F44336;

  --metallic-highlight: rgba(255, 255, 255, 0.08);
  --metallic-shimmer: rgba(255, 255, 255, 0.03);
  --metallic-edge-top: rgba(255, 255, 255, 0.15);
  --metallic-edge-bottom: rgba(0, 0, 0, 0.2);

  --brushed-metal: linear-gradient(135deg,
    hsl(240, 15%, 12%) 0%,
    hsl(240, 15%, 10%) 50%,
    hsl(240, 15%, 8%) 100%);
  ```

---

### 1.2 アニメーションキーフレーム（1時間）

#### タスク 1.2.1: グラデーションアニメーションを追加（20分）
- [ ] `src/index.css` の末尾に以下を追加:
  ```css
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
  ```

#### タスク 1.2.2: メタリックアニメーションを追加（20分）
- [ ] 以下を追加:
  ```css
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
  ```

#### タスク 1.2.3: エントランスアニメーションを追加（20分）
- [ ] 以下を追加:
  ```css
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

---

### 1.3 デザインシステム更新（1時間）

#### タスク 1.3.1: DesignPalette インターフェースを拡張（20分）
- [ ] `src/lib/designSystem.ts` を開く
- [ ] `DesignPalette` インターフェースに以下を追加:
  ```ts
  brandRed: string;
  brandRedEmphasis: string;
  brandRedSoft: string;
  brandRedGlow: string;
  brandPurple: string;
  brandPurpleEmphasis: string;
  brandPurpleSoft: string;
  brandPurpleGlow: string;
  brandGradient: string;
  metallicHighlight: string;
  metallicShimmer: string;
  brushedMetal: string;
  ```

#### タスク 1.3.2: createDesignPalette 関数を更新（30分）
- [ ] `createDesignPalette()` 関数内で以下を返す:
  ```ts
  brandRed: 'var(--brand-red)',
  brandRedEmphasis: 'var(--brand-red-emphasis)',
  brandRedSoft: 'var(--brand-red-soft)',
  brandRedGlow: 'var(--brand-red-glow)',
  brandPurple: 'var(--brand-purple)',
  brandPurpleEmphasis: 'var(--brand-purple-emphasis)',
  brandPurpleSoft: 'var(--brand-purple-soft)',
  brandPurpleGlow: 'var(--brand-purple-glow)',
  brandGradient: 'var(--brand-gradient)',
  metallicHighlight: 'var(--metallic-highlight)',
  metallicShimmer: 'var(--metallic-shimmer)',
  brushedMetal: 'var(--brushed-metal)',
  ```

#### タスク 1.3.3: TypeScript エラーを修正（10分）
- [ ] すべてのコンポーネントで TypeScript エラーがないか確認
- [ ] 必要に応じて型定義を調整

---

### 1.4 Tailwind設定（1時間）

#### タスク 1.4.1: Tailwind にブランドカラーを追加（30分）
- [ ] `tailwind.config.js` を開く
- [ ] `theme.extend.colors` に以下を追加:
  ```js
  'brand-red': 'var(--brand-red)',
  'brand-red-emphasis': 'var(--brand-red-emphasis)',
  'brand-red-soft': 'var(--brand-red-soft)',
  'brand-purple': 'var(--brand-purple)',
  'brand-purple-emphasis': 'var(--brand-purple-emphasis)',
  'brand-purple-soft': 'var(--brand-purple-soft)',
  ```

#### タスク 1.4.2: 簡単なテスト（30分）
- [ ] LandingPage で `bg-brand-purple` を試す
- [ ] TopBar ボタンで `text-brand-red` を試す
- [ ] ブラウザで色が表示されることを確認
- [ ] ダークモードで色が変わることを確認

---

## Phase 2: ランディングページ - 第一印象の革命（5-6時間）

### 2.1 ヒーローセクション背景（1.5時間）

#### タスク 2.1.1: アニメーションメッシュグラデーション背景を追加（30分）
- [ ] `src/components/LandingPage.tsx` を開く
- [ ] ヒーローセクション内に以下を追加:
  ```tsx
  <div
    className="absolute inset-0 opacity-40"
    style={{
      background: 'var(--brand-gradient-mesh)',
      backgroundSize: '200% 200%',
      animation: 'gradient-flow 8s ease infinite'
    }}
  />
  ```
- [ ] ブラウザで確認（グラデーションが流れるか）

#### タスク 2.1.2: メタリックノイズオーバーレイを追加（20分）
- [ ] 以下を追加:
  ```tsx
  <div
    className="absolute inset-0 opacity-30"
    style={{ backgroundImage: 'var(--metallic-noise)' }}
  />
  ```
- [ ] 透明度を調整（控えめに）

#### タスク 2.1.3: フローティング幾何学図形を追加（30分）
- [ ] 以下を追加:
  ```tsx
  <div className="absolute top-20 left-10 w-64 h-64 bg-brand-purple-soft rounded-full blur-3xl animate-float-gentle" />
  <div className="absolute bottom-20 right-10 w-80 h-80 bg-brand-red-soft rounded-full blur-3xl animate-float-gentle" style={{ animationDelay: '2s' }} />
  ```
- [ ] 位置とサイズを調整

#### タスク 2.1.4: reduced motion 対応（10分）
- [ ] すべてのアニメーションに `motion-reduce:animate-none` 追加
- [ ] ブラウザ設定でテスト

---

### 2.2 メインヘッドライン（1時間）

#### タスク 2.2.1: テキストグラデーションを適用（30分）
- [ ] ヒーロー見出し（`<h1>`）に以下を追加:
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

#### タスク 2.2.2: フォールバックカラーを追加（Safari対応）（15分）
- [ ] `color` プロパティをフォールバックとして追加
- [ ] Safari でテスト

#### タスク 2.2.3: アニメーション速度を調整（15分）
- [ ] 3秒が自然か確認
- [ ] 必要に応じて調整（2.5秒〜4秒）
- [ ] reduced motion でアニメーション停止を確認

---

### 2.3 CTAボタン - メタリック+グラデーション（2時間）

#### タスク 2.3.1: PremiumButton コンポーネントを作成（1時間）
- [ ] `src/components/ui/PremiumButton.tsx` を新規作成
- [ ] Framer Motion をインポート: `import { motion } from 'framer-motion';`
- [ ] 以下の構造を実装:
  - グラデーション背景（200% width）
  - メタリックエッジ（inset shadow）
  - シマーエフェクト（`metallic-shimmer` アニメーション）
  - グローパルス（`metallic-glow` アニメーション）
  - whileHover: backgroundPosition移動、scale 1.02、y -2
  - whileTap: scale 0.98

#### タスク 2.3.2: LandingPage でPremiumButtonを使用（30分）
- [ ] LandingPage で PremiumButton をインポート
- [ ] 既存のCTAボタンを PremiumButton に置き換え
- [ ] プロップスを渡す（onClick、children など）
- [ ] ビジュアル確認

#### タスク 2.3.3: ホバー/タップ効果を微調整（30分）
- [ ] ホバー時のグラデーション移動速度を調整
- [ ] グロー強度を調整（派手すぎないか確認）
- [ ] タップ時のスケールダウンを確認
- [ ] 感情チェック: 「触りたくなる」「高級感」

---

### 2.4 フィーチャーカード（1.5時間）

#### タスク 2.4.1: カードにホバーグラデーションボーダーを追加（45分）
- [ ] フィーチャーカードコンポーネントを見つける
- [ ] Framer Motion でラップ
- [ ] 以下を実装:
  - whileInView: opacity 0→1, y 20→0
  - transition: delay staggered (index * 0.05)
  - whileHover: y -4
  - グラデーションボーダー（::before 疑似要素、opacity 0→1 on hover）

#### タスク 2.4.2: メタリックノイズをホバー時に追加（30分）
- [ ] カード内に以下を追加:
  ```tsx
  <div
    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    style={{ backgroundImage: 'var(--metallic-noise)' }}
  />
  ```

#### タスク 2.4.3: カラーブルームエフェクトを追加（15分）
- [ ] `color-bloom` アニメーションをホバー時に適用
- [ ] 強度を調整（控えめに）
- [ ] 複数カードで確認

---

## Phase 3: コアUI - 日常の喜び（7-8時間）

### 3.1 Framer Motionインストール（15分）

#### タスク 3.1.1: Framer Motionをインストール（10分）
- [ ] ターミナルで `npm install framer-motion` 実行
- [ ] インストール完了を確認

#### タスク 3.1.2: 簡単なテスト（5分）
- [ ] 任意のコンポーネントで `import { motion } from 'framer-motion';` 試す
- [ ] エラーがないことを確認

---

### 3.2 RepoCard再設計（2.5時間）

#### タスク 3.2.1: motion.div でカードをラップ（30分）
- [ ] `src/components/RepoCard.tsx` を開く
- [ ] `<div>` を `<motion.div>` に変更
- [ ] 以下のプロップスを追加:
  - `layout`
  - `initial={{ opacity: 0, y: 8 }}`
  - `animate={{ opacity: 1, y: 0 }}`
  - `transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}`

#### タスク 3.2.2: whileHover を実装（45分）
- [ ] `whileHover` プロップスを追加:
  ```tsx
  whileHover={{
    y: -4,
    boxShadow: `0 12px 40px var(--brand-purple-soft), 0 6px 20px rgba(0,0,0,0.1)`,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
  }}
  ```
- [ ] Active 列のカードは `--brand-red-soft` を使用

#### タスク 3.2.3: グラデーションアクセントバー（トップ）を追加（30分）
- [ ] カード内に以下を追加:
  ```tsx
  <div
    className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    style={{
      background: repo.columnKey === 'Active'
        ? 'var(--brand-red)'
        : 'var(--brand-gradient)'
    }}
  />
  ```

#### タスク 3.2.4: メタリックブラッシュド背景（ホバー）を追加（30分）
- [ ] 以下を追加:
  ```tsx
  <div
    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-xl"
    style={{ background: 'var(--brushed-metal)' }}
  />
  ```

#### タスク 3.2.5: フォーカスリングを追加（15分）
- [ ] キーボードナビゲーション用のフォーカスリングを追加
- [ ] `tabIndex={0}`, `role="button"` を確認
- [ ] Tab キーでテスト

---

### 3.3 TopBar洗練（2時間）

#### タスク 3.3.1: 検索入力のフォーカス状態を強化（30分）
- [ ] `src/components/TopBar.tsx` を開く
- [ ] 検索 `<input>` に以下を追加:
  ```tsx
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
  ```

#### タスク 3.3.2: プライマリアクションボタンをグラデーションに（45分）
- [ ] Refresh ボタンを motion.button に変更
- [ ] 以下を実装:
  ```tsx
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
  ```

#### タスク 3.3.3: セカンダリボタンのホバー効果（30分）
- [ ] Add ボタンなどのセカンダリボタンにホバー効果追加
- [ ] Purple → Red カラーシフト
- [ ] スケールアニメーション

#### タスク 3.3.4: 削除ボタンに Red 強調（15分）
- [ ] 削除ボタンに `bg-brand-red` 適用
- [ ] ホバーで `bg-brand-red-emphasis`
- [ ] フォーカスリングは `focus-visible:ring-brand-red`

---

### 3.4 モーダルシステム（グラスモーフィズム）（2時間）

#### タスク 3.4.1: GlassModal コンポーネントを作成（1時間）
- [ ] `src/components/ui/GlassModal.tsx` を新規作成
- [ ] AnimatePresence, motion をインポート
- [ ] バックドロップを実装:
  - `backgroundColor: rgba(103, 58, 183, 0.15)`
  - `backdropFilter: blur(12px)`
  - フェードイン/アウト
- [ ] モーダルコンテンツを実装:
  - スケール 0.95 → 1
  - グラデーションボーダー
  - メタリックエッジ
  - blur(30px) バックドロップフィルター

#### タスク 3.4.2: 既存モーダルを GlassModal に置き換え（45分）
- [ ] TopBar の保存ビューモーダルを GlassModal に置き換え
- [ ] 他のモーダルダイアログがあれば置き換え
- [ ] プロップス（isOpen, onClose, children）を確認

#### タスク 3.4.3: フォーカストラップを実装（15分）
- [ ] モーダル内でフォーカスがトラップされることを確認
- [ ] Escape キーで閉じることを確認
- [ ] キーボードナビゲーションをテスト

---

### 3.5 TabNavigation強化（1.5時間）

#### タスク 3.5.1: アニメーショングラデーション下線を追加（45分）
- [ ] `src/components/TabNavigation.tsx` を開く
- [ ] 各タブを motion.button に変更
- [ ] アクティブタブに以下を追加:
  ```tsx
  {active === tab.id && (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-0.5"
      style={{ background: 'var(--brand-gradient)' }}
      layoutId="activeTab"
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    />
  )}
  ```

#### タスク 3.5.2: タブバッジにグラデーションを適用（30分）
- [ ] バッジ（count）に `bg-brand-gradient` を適用
- [ ] テキストを白に
- [ ] サイズとパディングを調整

#### タスク 3.5.3: ホバー/タップエフェクトを追加（15分）
- [ ] `whileHover={{ y: -1 }}`
- [ ] `whileTap={{ scale: 0.98 }}`
- [ ] すべてのタブで確認

---

## Phase 4: マイクロインタラクション - 細部への執着（4-5時間）

### 4.1 ドラッグ&ドロップ強化（2時間）

#### タスク 4.1.1: RepoCard にドラッグプロップスを追加（1時間）
- [ ] RepoCard に以下を追加:
  ```tsx
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.1}
  whileDrag={{
    scale: 1.05,
    boxShadow: `0 20px 60px var(--brand-purple-glow), 0 10px 30px rgba(0,0,0,0.2)`,
    backgroundColor: 'rgba(var(--bg-surface-rgb), 0.8)',
    backdropFilter: 'blur(8px)',
    cursor: 'grabbing'
  }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  ```

#### タスク 4.1.2: ドロップゾーンに Purple グローを追加（45分）
- [ ] `RepoColumn.tsx` を開く
- [ ] ドロップゾーンを motion.div に
- [ ] `isOver` 状態で以下をアニメート:
  ```tsx
  animate={{
    borderColor: isOver ? 'var(--brand-purple)' : 'var(--border)',
    backgroundColor: isOver ? 'var(--brand-purple-soft)' : 'transparent',
    boxShadow: isOver ? '0 0 30px var(--brand-purple-glow)' : 'none'
  }}
  ```

#### タスク 4.1.3: ドラッグ操作をテスト（15分）
- [ ] カードをドラッグして視覚効果を確認
- [ ] スプリングフィジックスが自然か確認
- [ ] ドロップゾーンのグローを確認

---

### 4.2 ローディング状態（グラデーションスケルトン）（1時間）

#### タスク 4.2.1: SkeletonCard コンポーネントを作成（40分）
- [ ] `src/components/ui/SkeletonCard.tsx` を新規作成
- [ ] 以下を実装:
  ```tsx
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
  ```

#### タスク 4.2.2: ローディング時に SkeletonCard を表示（20分）
- [ ] RepoBoard でローディング状態を確認
- [ ] `isLoading ? <SkeletonCard /> : <RepoCard />` を実装
- [ ] 複数のスケルトンカードを表示（3-5枚）
- [ ] グラデーションアニメーションを確認

---

### 4.3 通知システム（Dynamic Islandスタイル）（1.5時間）

#### タスク 4.3.1: Toast コンポーネントを作成（1時間）
- [ ] `src/components/ui/Toast.tsx` を新規作成
- [ ] AnimatePresence, motion をインポート
- [ ] 以下を実装:
  - 固定位置: `top-4 left-1/2 -translate-x-1/2`
  - スプリングアニメーション: y -100 → 0
  - グラデーション背景（success）または Red（error）
  - メタリックエッジ
  - ブラー効果

#### タスク 4.3.2: Toast をアプリに統合（30分）
- [ ] グローバル Toast コンテキストまたは状態を作成
- [ ] 成功/エラーメッセージで Toast を表示
- [ ] 自動で3秒後に消えるようにタイマー設定
- [ ] 複数の Toast を表示テスト

---

## 検証フェーズ（各Phase完了後）

### Phase 2完了時の検証（30分）
- [ ] ヒーロー背景のアニメーションが8秒で自然か？
- [ ] CTAボタンが「触りたい」と思わせるか？
- [ ] メタリック質感が過剰でないか？
- [ ] reduced motionで適切に静止するか?
- [ ] ライト/ダークモード両方で確認

### Phase 3完了時の検証（30分）
- [ ] カードホバーが250msで心地よいか？
- [ ] グローエフェクトが派手すぎないか？
- [ ] フォーカスリングが明確に見えるか（WCAG AA）？
- [ ] キーボード操作が滑らかか？（Tab, Enter, Escape）
- [ ] モーダルのグラスモーフィズムが高級感を出しているか？

### Phase 4完了時の検証（30分）
- [ ] ドラッグ操作がスプリングで自然か？
- [ ] 通知が邪魔にならないか？
- [ ] ローディングが楽しいか、イライラしないか？
- [ ] すべてのマイクロインタラクションが「落ち着き」と「驚き」のバランスを保っているか？

---

## 最終検証（すべてのPhase完了後）（2時間）

### ビジュアル品質チェック（45分）
- [ ] タイポグラフィ一貫性: 100%（すべてセマンティックスケール使用）
- [ ] グリッド準拠: 100%（8px外の値ゼロ）
- [ ] モーション対応: 100%（すべての遷移にmotion-reduce）
- [ ] メタリック質感: 戦略的（CTAボタン、カードホバー、モーダル）
- [ ] ライト/ダークモード両方で全ページ確認

### アクセシビリティチェック（45分）
- [ ] WCAG AA: コントラスト比4.5:1以上（ツールで検証）
- [ ] フォーカスリング: すべてのインタラクティブ要素（Tab キーで確認）
- [ ] ARIA属性: 完全（スクリーンリーダーでテスト）
- [ ] キーボード操作: 完全（マウスなしで全機能を使用）
- [ ] フォーカストラップ: モーダル内で適切に動作

### パフォーマンスチェック（30分）
- [ ] グラデーションアニメーションのFPS（60fps維持）
- [ ] スクロールパフォーマンス（滑らか）
- [ ] メモリリーク（長時間使用でメモリ増加なし）
- [ ] バンドルサイズ（Framer Motion追加後のサイズ確認）

---

## ドキュメント作成（1時間）

### デザインシステムガイドライン（45分）
- [ ] `docs/design-system-guidelines.md` を作成
- [ ] タイポグラフィ階層を記述
- [ ] スペーシングシステムを記述
- [ ] モーションガイドラインを記述
- [ ] コード例を追加

### CLAUDE.md 更新（15分）
- [ ] ブランドカラーセクションを追加
- [ ] デザイントークンの使い方を記述
- [ ] アクセシビリティ要件を明記

---

## 総タスク数: 82タスク
## 推定総時間: 約32時間（約4-5日間）

---

## 進捗追跡

各タスクにチェックボックス `[ ]` があります。完了したら `[x]` にマークしてください。

### Phase別進捗
- Phase 0: 0/16 タスク完了
- Phase 1: 0/13 タスク完了
- Phase 2: 0/13 タスク完了
- Phase 3: 0/21 タスク完了
- Phase 4: 0/9 タスク完了
- 検証: 0/6 タスク完了
- ドキュメント: 0/2 タスク完了

**全体進捗: 0/82 (0%)**
