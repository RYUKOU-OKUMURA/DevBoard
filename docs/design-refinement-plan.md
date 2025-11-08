# 🎨 カンバンページ デザイン洗練計画

**作成日**: 2025-11-09
**対象**: DevBoard カンバンページ全体のデザイン統一と洗練
**参照**: Atlassian Design System原則、design-agent.md

---

## 📊 現状分析サマリー

### 優れている点（継続）

- ✅ 完全なCSS変数ベース（168箇所）
- ✅ ハードコード値ゼロ
- ✅ ダークモード完全対応
- ✅ 良好なアクセシビリティ基礎
- ✅ スムーズなアニメーション

### 改善が必要な点

- ⚠️ 2つの紫色システムが混在（`--color-1` vs `--accent-purple`）
- ⚠️ ブランドカラーの統一性欠如
- ⚠️ コントラスト比未検証
- ⚠️ 一部ARIA属性の拡張余地

---

## 🎯 洗練計画の目標

1. **ブランドカラーの統一**: トップページのパープル系を全体に適用
2. **デザイントークンの整理**: Atlassian Design System原則に基づく命名
3. **アクセシビリティ強化**: WCAG 2.1 AA準拠
4. **視覚的一貫性**: コンポーネント間のスタイル統一

---

## 📋 実施内容

### フェーズ1: ブランドカラーシステムの統一

#### 1.1 CSS変数の再構成（index.css）

**現状の問題:**
```css
/* 2つの紫色システムが混在 */
--color-1: #512DA8;           /* ランディングページ用 */
--accent-purple: #7c3aed;     /* プリセット機能用 */
```

**新しい構造:**
```css
/* ブランドカラーとして統一 */
--brand-primary: #512DA8 (light) / #6c63ff (dark)
--brand-emphasis: #3d1f7d (light) / #554ae5 (dark)
--brand-muted: rgba(81, 45, 168, 0.12/0.16)
--brand-border: rgba(81, 45, 168, 0.24/0.32)
--brand-soft: rgba(81, 45, 168, 0.15/0.18)
--brand-glow: rgba(81, 45, 168, 0.35)

/* 後方互換性のためのエイリアス（段階的削除予定） */
--color-1: var(--brand-primary);
--accent-purple: var(--brand-primary);
```

#### 1.2 コントラスト比の計算と調整

**検証対象:**
- ライト: `#512DA8` on white → 4.5:1以上確保
- ダーク: `#6c63ff` on `#161b22` → 4.5:1以上確保
- ミュート色の可読性
- ボーダー色の視認性

**必要に応じて色を微調整**

#### 1.3 デザインシステムの更新（designSystem.ts）

**追加するブランドカラートークン:**
```typescript
export interface DesignPalette {
  // 既存のプロパティ...

  // ブランドカラー（新規）
  brandPrimary: string;
  brandEmphasis: string;
  brandMuted: string;
  brandBorder: string;
  brandSoft: string;
  brandGlow: string;
}
```

**プリセットスタイルの追加:**
```typescript
brandButton: {
  background: palette.brandPrimary,
  color: '#ffffff',
  hover: palette.brandEmphasis,
},
brandBadge: {
  background: palette.brandMuted,
  color: palette.brandPrimary,
  border: palette.brandBorder,
}
```

---

### フェーズ2: カンバンページコンポーネントの洗練

#### 2.1 TopBar.tsx のブランドカラー適用

**変更箇所:**
- プリセット選択ドロップダウン（line 322）
- プリセット保存ボタン（line 334）
- プリセット関連UI全体

**変更前:**
```tsx
className="bg-[var(--accent-purple)]"
```

**変更後:**
```tsx
style={componentStyles.brandButton}
```

#### 2.2 RepoBoard.tsx のビジュアル改善

**グリッドレイアウトの最適化:**
- カラム間のギャップ調整
- レスポンシブブレークポイント見直し
- スクロール体験の改善

**空状態のデザイン:**
- より魅力的な空状態メッセージ
- ブランドカラーを活用したイラストレーション

#### 2.3 RepoCard.tsx のスタイル統一

**改善項目:**
- シャドウの統一（`shadow-sm`）
- ホバーエフェクトの洗練
- トランジションの最適化
- ブランドカラーのアクセント使用

**具体的な変更:**
```tsx
// フォーカスリング
focus-visible:ring-2
focus-visible:ring-[var(--brand-primary)]
focus-visible:ring-offset-2

// ホバーエフェクト
hover:shadow-md
hover:-translate-y-0.5
motion-safe:transition-all
```

#### 2.4 RepoColumn.tsx のヘッダー改善

**ブランドカラーとの調和:**
- カラムヘッダーの色分けを維持しつつ、ブランドカラーを一部に適用
- タイトル編集モードでブランドカラーのフォーカスリング
- ドラッグハンドルのビジュアル改善

---

### フェーズ3: アクセシビリティ強化

#### 3.1 ARIA属性の拡張

**追加するARIA属性:**

```tsx
// RepoColumn.tsx - カラムにregionロール
<div role="region" aria-label={`${title}カラム、${repos.length}件のリポジトリ`}>

// RepoBoard.tsx - ライブリージョン
<div aria-live="polite" aria-atomic="true" className="sr-only">
  検索結果: {filteredCount}件のリポジトリが見つかりました
</div>

// RepoCard.tsx - ドラッグ状態
aria-grabbed={isDragging}

// TopBar.tsx - 検索フィールド
aria-describedby="search-description"
```

#### 3.2 キーボードナビゲーション強化

**ショートカット追加:**
- `/` - 検索フォーカス
- `Ctrl+K` - コマンドパレット風検索
- `1-4` - 各カラムへのフォーカス移動
- `N` - 新しいプリセット作成

#### 3.3 スクリーンリーダー対応

**視覚的情報のテキスト化:**
```tsx
<span className="sr-only">
  {repo.isPrivate ? 'プライベートリポジトリ' : 'パブリックリポジトリ'}
  、{repo.stargazersCount}スター
  、最終更新{timeAgo(repo.pushedAt)}
</span>
```

---

### フェーズ4: UI/UXの細部洗練

#### 4.1 マイクロインタラクションの追加

**スムーズな体験:**
- カード追加時のフェードインアニメーション
- プリセット切り替え時のスライドトランジション
- ドラッグ開始時の視覚的フィードバック強化

#### 4.2 ローディング状態の改善

**スケルトンスクリーン:**
- カード読み込み中のプレースホルダー
- ブランドカラーのパルスアニメーション
- 滑らかなコンテンツ表示

#### 4.3 エラー状態のデザイン

**ユーザーフレンドリーなエラー:**
- ブランドカラーを活用したエラーUI
- 具体的なアクションガイダンス
- リトライボタンの明示

#### 4.4 トップバーの洗練

**視覚的階層:**
- 検索バーの強調
- プリセット機能のブランドカラー適用
- アイコンと文字のバランス調整

---

## 🎨 デザイントークン定義（Atlassian Design System準拠）

### カラーシステム

```typescript
// Semantic color tokens
colors: {
  brand: {
    primary: '--brand-primary',
    emphasis: '--brand-emphasis',
    muted: '--brand-muted',
    border: '--brand-border',
  },
  surface: {
    app: '--bg-app',
    primary: '--bg-primary',
    secondary: '--bg-secondary',
    tertiary: '--bg-tertiary',
  },
  text: {
    primary: '--text-primary',
    secondary: '--text-secondary',
    muted: '--text-muted',
  },
  accent: {
    success: '--accent-green',
    warning: '--accent-yellow',
    danger: '--accent-red',
    info: '--accent-blue',
  }
}
```

### スペーシングシステム（8pxグリッド）

```typescript
spacing: {
  scale: {
    0: '0',
    25: '0.125rem',  // 2px
    50: '0.25rem',   // 4px
    100: '0.5rem',   // 8px
    200: '1rem',     // 16px
    300: '1.5rem',   // 24px
    400: '2rem',     // 32px
    500: '2.5rem',   // 40px
  }
}
```

---

## 📦 影響範囲と変更ファイル

### CSS/デザインシステム（3ファイル）
1. `src/index.css` - CSS変数定義の統一
2. `src/lib/designSystem.ts` - ブランドカラートークン追加
3. `tailwind.config.js` - Tailwind設定の更新

### コンポーネント（5ファイル）
1. `src/components/TopBar.tsx` - プリセット関連のブランドカラー適用
2. `src/components/RepoBoard.tsx` - レイアウトとARIA改善
3. `src/components/RepoCard.tsx` - スタイル統一、アクセシビリティ強化
4. `src/components/RepoColumn.tsx` - ヘッダー改善、ARIA追加
5. `src/components/UpdatesTab.tsx` - PRバッジのブランドカラー適用

---

## ⏱️ 作業順序

1. **CSS変数とデザインシステムの更新**（基礎）
2. **コントラスト比の検証と調整**（品質保証）
3. **TopBarのブランドカラー適用**（視覚的インパクト大）
4. **カードとカラムの洗練**（細部の品質）
5. **アクセシビリティ強化**（包括性）
6. **マイクロインタラクション追加**（UX向上）
7. **テストとビルド確認**（検証）

---

## ✅ 期待される成果

1. **統一されたブランドアイデンティティ** - トップページとカンバンページで一貫した紫色の使用
2. **WCAG 2.1 AA準拠** - すべての要素で適切なコントラスト比
3. **優れたアクセシビリティ** - スクリーンリーダー、キーボードナビゲーション完全対応
4. **洗練されたUI** - Atlassian Design Systemの原則に基づく美しいデザイン
5. **保守性の向上** - 一元化されたデザイントークンで将来の変更が容易

---

## 📚 参考資料

- [Atlassian Design System](https://atlassian.design/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [design-agent.md](.claude/agents/design-agent.md)
- [DevBoard CLAUDE.md](../CLAUDE.md)

---

## 📝 実施ステータス

- [x] フェーズ1: ブランドカラーシステムの統一
- [x] フェーズ2: カンバンページコンポーネントの洗練
- [x] フェーズ3: アクセシビリティ強化
- [x] フェーズ4: UI/UXの細部洗練
- [ ] 最終テストとビルド確認
- [x] ドキュメント更新

**最終更新**: 2025-11-09（実装完了）
