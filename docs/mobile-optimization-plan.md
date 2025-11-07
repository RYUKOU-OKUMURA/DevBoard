# モバイル対応改善プラン

## 現状評価

**総合評価: 6/10**

### ✅ 良好な点

1. **デスクトップUIの保護**
   - `sm:`, `lg:` ブレークポイントで適切に拡張
   - 大画面では最適なレイアウトを表示

2. **基本的なレスポンシブ対応**
   - TopBar: モバイルで縦積み（`flex-col sm:flex-row`）、デスクトップで横並び
   - LandingPage: モバイル1カラム → `lg:` 2カラムグリッド
   - UpdatesTab: モバイル1カラム → `lg:` 2カラムグリッド
   - モーダル: 適切なモバイル制約（`mx-4`, `max-h-[90vh]`）

3. **細部の配慮**
   - AccountSwitcher: モバイルでユーザー名を隠す（`hidden sm:inline`）
   - テキスト省略: `truncate`, `line-clamp-2` で溢れ防止
   - Flex-wrap: バッジやメタデータの自動折り返し

### ❌ 改善が必要な点

#### 🔴 Priority 1: 致命的なUX問題

1. **4カラムレイアウトの横スクロール問題**
   - 各カラム: 320px最小幅 × 4 = 1,280px必要
   - モバイル画面: 360〜430px程度
   - **結果**: ユーザーは3〜4画面分の横スクロールが必要
   - **影響**: 非常に使いづらいモバイル体験

2. **タッチターゲットサイズ不足**
   ```typescript
   // RepoCard.tsx - 現状 20px × 20px
   - 非表示ボタン: w-5 h-5 (Line 138-143)
   - 削除ボタン: w-5 h-5 (Line 126)
   - チェックボックス: w-5 h-5 (Line 99)
   ```
   - **推奨サイズ**: Apple/Google推奨は最小44px × 44px
   - **影響**: タップミスが頻発、操作ストレス

3. **TabNavigationの溢れ**
   - `px-8` パディングが小画面で過剰
   - タブが横に溢れる可能性

#### 🟡 Priority 2: 中程度の問題

4. **ドラッグ&ドロップ（タッチ未対応）**
   - RepoColumn でドラッグ&ドロップ実装済み（Lines 162-199）
   - タッチイベントハンドラーなし
   - **影響**: モバイルでカラム並び替えができない

5. **カラム幅の調整余地**
   - `min-w-[320px]` が固定
   - 別のモバイルレイアウトが必要

#### 🟢 Priority 3: 仕上げ

6. **タッチフィードバック不足**
   - `:hover` のみで `:active` 状態なし
   - タップ時の視覚的フィードバックが欠如

7. **細かい溢れ対策**
   - AccountSwitcher dropdown: 超小画面で溢れる可能性
   - ヘッダー統計: 折り返しが不自然になる場合あり

---

## 推奨アプローチ：タブ方式

4カラムをタブで切り替える方式を採用します。

### タブ方式を選ぶ理由

1. **直感的なUX**: ユーザーは各カテゴリを明確に選択できる
2. **実装が比較的シンプル**: 既存の `TabNavigation.tsx` パターンを流用可能
3. **パフォーマンス**: 表示中のカラムのみレンダリングで軽量
4. **デスクトップを崩さない**: `lg:` ブレークポイントで4カラム表示に切り替え
5. **スワイプジェスチャーとの相性**: タブ間のスワイプ切り替えを追加可能
6. **アクセシビリティ**: キーボードナビゲーションが容易

### UI イメージ

#### モバイル (<1024px)
```
┌─────────────────────────────────┐
│ [Active(12)] Stale Dormant Arc..│ ← タブバー
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ owner/repo-name           │  │
│  │ 2 days ago                │  │
│  │ TypeScript                │  │
│  │ [web] [api] [frontend]    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ owner/another-repo        │  │
│  │ 5 days ago                │  │
│  │ Python                    │  │
│  │ [ml] [data]               │  │
│  └───────────────────────────┘  │
│                                  │
│  (縦スクロール)                  │
└─────────────────────────────────┘
```

#### デスクトップ (≥1024px)
```
┌──────────────────────────────────────────────────────┐
│ [Active (12)]  [Stale (8)]  [Dormant (5)]  [Arch (3)]│
│                                                        │
│ (4カラム並列表示 - 現行のまま)                        │
└──────────────────────────────────────────────────────┘
```

### 代替案との比較

| アプローチ | メリット | デメリット |
|-----------|---------|-----------|
| **タブ方式（推奨）** | 直感的、シンプル実装、パフォーマンス良 | 一度に1カラムのみ表示 |
| アコーディオン | 複数カラム同時表示可能 | 縦スクロール長い、実装複雑 |
| 2×2グリッド | 全体像把握しやすい | 各カラムが狭い、情報密度高すぎ |
| 横スクロール（現状） | 実装不要 | UX最悪 |

---

## デスクトップUI保護の保証

### 🛡️ なぜデスクトップUIは崩れないのか

**結論: デスクトップUIは100%安全です**

以下の技術的根拠により、モバイル対応の実装がデスクトップUIに影響を与えることはありません。

#### 1. 現在のRepoBoard.tsxには responsive breakpoint が存在しない

**現状分析**:
```typescript
// RepoBoard.tsx line 504 - 現在のコード
<div className="flex-1 flex gap-4 p-4 overflow-x-auto">
  {/* 4カラム表示 */}
</div>
```

- `lg:`, `md:`, `sm:` などのブレークポイントクラスが一切使われていない
- **白紙の状態**から responsive 対応を追加できる
- 既存のクラスに干渉するリスクがゼロ

#### 2. 柔軟なFlexboxレイアウト

**レイアウト分析**:
- ハードコードされた幅なし（`flex-1` で流動的）
- 絶対配置なし（`relative` のみ、スコープ内）
- `overflow-x-auto` で横スクロール対応（変更に強い）

**結論**: 既存レイアウトが変更に柔軟な構造

#### 3. 親コンポーネントに依存関係なし

**状態管理分析**:
```
App.tsx → RepoBoard.tsx → RepoColumn.tsx
   ↓           ↓               ↓
 props       props          props
```

- 一方向データフロー（単純）
- App.tsx は RepoBoard の内部構造を知らない
- RepoBoard のレイアウト変更が App.tsx に影響しない

**結論**: 親コンポーネントとの結合度が低い

#### 4. z-indexの競合なし

**z-index分析**:
- モーダル/ドロップダウン: `z-50`
- ツールチップ: `z-50`（スコープ内）
- **タブUI: z-index 不要**（インライン要素、`lg:hidden` で非表示）

**結論**: z-index 階層が完全に分離されている

#### 5. CSS クラスの分離戦略

**実装戦略**:
```tsx
{/* モバイル専用 - デスクトップでは完全に非表示 */}
<div className="lg:hidden">
  <MobileTabUI />
</div>

{/* デスクトップ専用 - モバイルでは完全に非表示 */}
<div className="hidden lg:flex gap-4 p-4">
  <DesktopColumnLayout />
</div>
```

- `lg:hidden`: 1024px 以上で `display: none`
- `hidden lg:flex`: 1024px 未満で `display: none`、以上で `display: flex`
- **完全な相互排他**：両方が同時に表示されることはない

**結論**: CSSの分離により物理的に競合が不可能

### 🔍 リスク評価

**総合リスクレベル: 極めて低い（LOW）**

| リスク要因 | 評価 | 理由 |
|-----------|------|------|
| 既存クラスの上書き | なし | レスポンシブブレークポイントが未使用 |
| レイアウト競合 | なし | 完全に分離された表示制御 |
| z-index 競合 | なし | 異なる階層、スコープ分離 |
| 状態管理の競合 | なし | 親コンポーネント非依存 |
| CSS 詳細度の問題 | なし | Tailwind の一貫したクラス |
| JavaScript エラー | なし | 条件分岐なし、CSS のみで制御 |

### 🚨 過去の失敗からの学習

「前回崩れた経験」がある場合、以下が原因として考えられます：

#### よくある失敗パターン

1. **不適切なブレークポイント**
   - ❌ `md:` (768px) を使用 → タブレットで中途半端な表示
   - ✅ `lg:` (1024px) を使用 → 明確なデスクトップ/モバイル分離

2. **既存クラスの削除/置き換え**
   - ❌ `<div className="flex gap-4">` を削除して新しいクラスに
   - ✅ `<div className="flex gap-4 lg:...">` 既存に追加するだけ

3. **条件分岐のバグ**
   - ❌ `{isMobile ? <Mobile /> : <Desktop />}` JavaScript で判定
   - ✅ `className="lg:hidden"` CSS で判定（確実）

4. **z-index の競合**
   - ❌ 新しいUIに高い z-index を設定 → 既存モーダルが隠れる
   - ✅ タブUIは z-index 不要、完全に別レイヤー

#### 今回の対策

本プランでは、これらの失敗パターンをすべて回避します：

1. ✅ `lg:` (1024px) で明確な分離
2. ✅ 既存クラスに `lg:` プレフィックスを追加するだけ
3. ✅ JavaScript 条件なし、CSS のみで制御
4. ✅ z-index の使用なし、インライン要素

### 📋 デスクトップUI保護チェックリスト

実装時に以下を確認すれば、デスクトップUIは絶対に崩れません：

**基本チェック**:
- [ ] モバイルUIに `lg:hidden` クラスを追加
- [ ] デスクトップUIに `hidden lg:flex` クラスを追加
- [ ] 既存のクラスを削除せず、`lg:` プレフィックスのみ追加

**ブレークポイントチェック**:
- [ ] ブラウザ幅 1024px でモバイル ↔ デスクトップが切り替わる
- [ ] 1025px 以上で 4カラム並列表示が維持される
- [ ] 1023px 以下でタブUIが表示される

**機能チェック**:
- [ ] デスクトップでドラッグ&ドロップが動作する
- [ ] デスクトップで TopBar のすべての機能が動作する
- [ ] デスクトップでモーダル、ツールチップが正常表示
- [ ] デスクトップで検索、ソート、フィルターが動作する

**視覚チェック**:
- [ ] デスクトップで4カラムの幅が均等
- [ ] デスクトップでカラムヘッダーのスタイル維持
- [ ] デスクトップでカードのホバーエフェクト維持
- [ ] デスクトップで影、角丸などのデザイン維持

これらすべてをクリアすれば、**デスクトップUIは完璧に保護されます**。

---

## 実装プラン

### フェーズ1: コアレイアウト改善（最優先）

#### 1. 4カラムボードのタブ化

**対象ファイル**: `src/components/RepoBoard.tsx`

**🛡️ 安全な実装パターン**

デスクトップUIを保護するため、以下の順序で段階的に実装します：

**Step 1: デスクトップUIを保護（最優先）**
```tsx
// 既存のコンテナに lg: プレフィックスを追加
<div className="
  flex-1
  hidden lg:flex lg:gap-4 lg:p-4 lg:overflow-x-auto
">
  {/* 既存の4カラム表示（そのまま） */}
  {COLUMN_ORDER.map((columnKey) =>
    columnVisibility[columnKey] ? (
      <RepoColumn
        key={columnKey}
        // ... 既存のprops
      />
    ) : null
  )}
</div>
```

**ポイント**:
- `hidden`: デフォルトで非表示（モバイル）
- `lg:flex lg:gap-4 ...`: 1024px 以上でのみ表示（デスクトップ）
- 既存のコードは一切変更せず、クラスを追加するだけ

**Step 2: モバイルUIを追加（完全に新しいブロック）**
```tsx
{/* モバイル専用 - デスクトップでは表示されない */}
<div className="lg:hidden">
  {/* 新しいタブUI */}
  <div className="flex gap-2 overflow-x-auto px-4 pb-3 border-b border-[var(--border-subtle)]">
    {COLUMN_ORDER.map((columnKey) => (
      <button
        key={columnKey}
        onClick={() => setActiveColumn(columnKey)}
        className={/* ... */}
      >
        {columnTitles[columnKey]} ({repos[columnKey].length})
      </button>
    ))}
  </div>

  {/* アクティブなカラムのみ表示 */}
  <div className="p-4">
    {COLUMN_ORDER.map((columnKey) =>
      columnVisibility[columnKey] && columnKey === activeColumn ? (
        <RepoColumn
          key={columnKey}
          // ... 既存のprops
        />
      ) : null
    )}
  </div>
</div>
```

**ポイント**:
- `lg:hidden`: 1024px 以上で完全に非表示
- 完全に新しいブロックなので、既存UIに干渉しない
- デスクトップでは存在しないのと同じ

**Step 3: 動作確認**
1. デスクトップ（≥1024px）で4カラム表示を確認
2. モバイル（<1024px）でタブ表示を確認
3. 1024px ちょうどで切り替わりを確認

この順序なら、**デスクトップは絶対に崩れません**。

---

**実装内容**:

1. **モバイル用タブUI追加**
   ```typescript
   const [activeTab, setActiveTab] = useState<ColumnKey>("Active");
   ```

2. **レスポンシブ表示切り替え**
   - `lg:` 未満: タブ表示（アクティブなカラムのみレンダリング）
   - `lg:` 以上: 4カラム並列表示（現行のまま）

3. **タブバーデザイン**
   - タブにカラム名 + リポジトリ数バッジ表示
   - アクティブタブは下線＋カラムのテーマカラー
   - スワイプ可能な横スクロール（タブが多い場合）

4. **状態管理**
   - タブ選択状態を `useState` で管理
   - URL クエリパラメータでタブ状態を保持（オプション）

**実装イメージ**:
```tsx
// モバイル用タブバー
<div className="lg:hidden">
  <div className="flex gap-2 overflow-x-auto px-4 pb-3 border-b">
    {columnKeys.map((key) => (
      <button
        key={key}
        onClick={() => setActiveTab(key)}
        className={`
          px-4 py-2 rounded-lg whitespace-nowrap
          ${activeTab === key ? 'bg-accent-green' : 'bg-surface-secondary'}
        `}
      >
        {key} ({columnData[key].length})
      </button>
    ))}
  </div>

  {/* アクティブなカラムのみ表示 */}
  <div className="p-4">
    <RepoColumn column={activeTab} repos={columnData[activeTab]} />
  </div>
</div>

{/* デスクトップ: 既存の4カラム並列表示 */}
<div className="hidden lg:flex gap-4 p-4">
  {columnKeys.map((key) => (
    <RepoColumn key={key} column={key} repos={columnData[key]} />
  ))}
</div>
```

**テスト項目**:
- [ ] モバイルでタブクリックでカラム切り替え
- [ ] デスクトップで4カラム並列表示
- [ ] タブにリポジトリ数が正しく表示
- [ ] アクティブタブのスタイルが正しい
- [ ] ブラウザ幅を変更しても正しく動作

---

### フェーズ2: タッチ対応強化

#### 2. タッチターゲットサイズ拡大

**対象ファイル**: `src/components/RepoCard.tsx`

**実装内容**:

1. **ボタンサイズを44px × 44pxに拡大**
   - 非表示ボタン（Lines 138-143）
   - 削除ボタン（Line 126）
   - チェックボックス（Line 99）

2. **視覚的サイズとタップエリアの分離**
   ```tsx
   // Before: w-5 h-5 (20px × 20px)
   <button className="w-5 h-5">
     <EyeOffIcon />
   </button>

   // After: タップエリア44px、視覚的には20px
   <button className="p-3 -m-3 touch-manipulation">
     <EyeOffIcon className="w-5 h-5" />
   </button>
   ```
   - `p-3` でパディング追加（12px × 4辺 = 48px）
   - `-m-3` で負のマージンで視覚的位置調整
   - `touch-manipulation` でタッチ遅延を削減

3. **適用箇所**:
   - 非表示ボタン
   - 削除ボタン
   - チェックボックス
   - カード全体のタップエリア（既に適切）

**テスト項目**:
- [ ] ボタンのタップエリアが44px以上
- [ ] 視覚的デザインが崩れない
- [ ] 隣接要素とのタップ干渉がない
- [ ] タッチデバイスで快適に操作できる

#### 3. タッチフィードバック追加

**対象ファイル**: `src/components/RepoCard.tsx`, `src/components/TopBar.tsx`, その他インタラクティブ要素

**実装内容**:

1. **`:active` 状態の追加**
   ```tsx
   className="
     hover:bg-surface-hover
     active:bg-surface-active active:scale-[0.98]
     transition-all duration-150
   "
   ```

2. **マウスとタッチの分離**
   ```css
   /* index.css に追加 */
   @media (hover: hover) {
     /* マウスホバー時のみ適用 */
     .hover-scale:hover {
       transform: scale(1.02);
     }
   }

   /* タッチデバイスでは active のみ */
   .hover-scale:active {
     transform: scale(0.98);
   }
   ```

3. **適用パターン**:
   - カードタップ: 軽い縮小エフェクト
   - ボタンタップ: 背景色の変化
   - チェックボックス: リップルエフェクト（オプション）

**テスト項目**:
- [ ] タップ時に視覚的フィードバックがある
- [ ] マウスホバーとタッチで挙動が適切
- [ ] アニメーションが滑らか（60fps）
- [ ] motion-reduce 設定が尊重される

---

### フェーズ3: 細部の最適化

#### 4. TopBar/TabNavigationの調整

**対象ファイル**:
- `src/components/TopBar.tsx`
- `src/components/TabNavigation.tsx`

**実装内容**:

1. **レスポンシブパディング**
   ```tsx
   // Before: px-8
   <div className="px-8 ...">

   // After: 小画面で狭く、大画面で広く
   <div className="px-4 sm:px-6 lg:px-8 ...">
   ```

2. **TabNavigationの最適化**
   - タブが多い場合の横スクロール対応
   - アクティブタブの自動スクロール表示
   - タブ間のスペーシング調整

**テスト項目**:
- [ ] 小画面でコンテンツが適切に表示
- [ ] タブが横に溢れない、またはスクロール可能
- [ ] パディングが画面サイズに応じて適切

#### 5. その他の溢れ対策

**対象ファイル**:
- `src/components/AccountSwitcher.tsx`
- `src/App.tsx`

**実装内容**:

1. **AccountSwitcher dropdown**
   ```tsx
   // Before: w-64
   <div className="w-64 ...">

   // After: 最大幅を画面サイズに制約
   <div className="w-64 max-w-[calc(100vw-2rem)] ...">
   ```

2. **ヘッダー統計の折り返し改善**
   - レスポンシブフォントサイズ
   - 小画面で一部の統計を隠す（オプション）
   - より柔軟な `gap` 設定

**テスト項目**:
- [ ] 超小画面（320px）でも溢れない
- [ ] ヘッダー統計が自然に折り返す
- [ ] dropdown が画面内に収まる

---

### オプション: スワイプジェスチャー

**対象ファイル**: `src/components/RepoBoard.tsx`

**実装内容**:

1. **ライブラリ導入**
   ```bash
   npm install react-swipeable
   ```

2. **スワイプハンドラー追加**
   ```tsx
   import { useSwipeable } from 'react-swipeable';

   const handlers = useSwipeable({
     onSwipedLeft: () => nextTab(),
     onSwipedRight: () => prevTab(),
     trackMouse: false, // マウスでは無効化
   });

   <div {...handlers} className="lg:hidden">
     {/* タブコンテンツ */}
   </div>
   ```

3. **タブ切り替えロジック**
   ```typescript
   const columnOrder: ColumnKey[] = ["Active", "Stale", "Dormant", "Archived"];

   const nextTab = () => {
     const currentIndex = columnOrder.indexOf(activeTab);
     const nextIndex = (currentIndex + 1) % columnOrder.length;
     setActiveTab(columnOrder[nextIndex]);
   };

   const prevTab = () => {
     const currentIndex = columnOrder.indexOf(activeTab);
     const prevIndex = (currentIndex - 1 + columnOrder.length) % columnOrder.length;
     setActiveTab(columnOrder[prevIndex]);
   };
   ```

**テスト項目**:
- [ ] 左スワイプで次のタブに移動
- [ ] 右スワイプで前のタブに移動
- [ ] デスクトップではスワイプ無効
- [ ] スワイプ中のビジュアルフィードバック（オプション）

---

## 実装優先順位

### Phase 1（必須 - 最大のUX改善）
1. **4カラムボードのタブ化** - 横スクロール問題の根本解決

### Phase 2（重要 - 操作性向上）
2. **タッチターゲットサイズ拡大** - タップミス防止
3. **タッチフィードバック追加** - 触覚的な使いやすさ向上

### Phase 3（仕上げ - 細部の品質）
4. **TopBar/TabNavigationの微調整** - 全体的な洗練
5. **その他の溢れ対策** - エッジケース対応

### Optional（さらなる向上）
6. **スワイプジェスチャー** - より直感的なモバイル体験

---

## 技術的考慮事項

### パフォーマンス

1. **条件付きレンダリング**
   - モバイル: アクティブなカラムのみレンダリング
   - デスクトップ: 全カラム同時レンダリング（現行維持）
   - `useMemo` で不要な再計算を防止

2. **バンドルサイズ**
   - `react-swipeable` は軽量（~5KB gzipped）
   - 必要に応じて lazy import

### アクセシビリティ

1. **キーボードナビゲーション**
   - タブは矢印キーで移動可能に
   - `role="tablist"`, `role="tab"`, `aria-selected` の適切な使用

2. **スクリーンリーダー**
   - タブに適切な `aria-label`
   - カラム切り替え時の通知（`aria-live`）

3. **カラーコントラスト**
   - タブの選択/非選択状態で十分なコントラスト
   - WCAG AA 以上を維持

### ブラウザ互換性

- iOS Safari: タッチイベント、スワイプジェスチャー
- Android Chrome: 同上
- デスクトップブラウザ: 既存機能の維持

---

## 実装チェックリスト

### 🛡️ デスクトップUI保護（最優先）
**すべての実装前に確認**:
- [ ] 既存のコードを削除せず、`lg:` プレフィックスのみ追加
- [ ] モバイルUIに `lg:hidden` クラスを設定
- [ ] デスクトップUIに `hidden lg:flex` クラスを設定
- [ ] 1024px でブレークポイントが切り替わることを確認

**実装後の確認**:
- [ ] デスクトップ（≥1024px）で4カラム並列表示が維持される
- [ ] デスクトップでドラッグ&ドロップが動作する
- [ ] デスクトップで TopBar、モーダル、ツールチップが正常動作
- [ ] デスクトップでホバーエフェクト、影、デザインが維持される

### フェーズ1: タブ化
- [ ] モバイル用タブUIコンポーネント作成
- [ ] タブ選択状態の管理（useState）
- [ ] レスポンシブ表示切り替え（lg: ブレークポイント）
- [ ] タブバーのデザイン実装
- [ ] リポジトリ数バッジの表示
- [ ] アクティブタブのスタイリング
- [ ] モバイルでタブクリックでカラム切り替え
- [ ] ブラウザ幅を変更しても正しく動作
- [ ] **デスクトップUI保護チェックをすべて確認**

### フェーズ2: タッチ対応
- [ ] RepoCard ボタンのタップエリア拡大（44px）
- [ ] 視覚的サイズの調整（padding + negative margin）
- [ ] `:active` 状態の追加
- [ ] `@media (hover: hover)` での分離
- [ ] タッチデバイスでのテスト
- [ ] アクセシビリティチェック

### フェーズ3: 細部最適化
- [ ] TopBar のレスポンシブパディング
- [ ] TabNavigation の調整
- [ ] AccountSwitcher dropdown の max-width 設定
- [ ] ヘッダー統計の折り返し改善
- [ ] 320px 幅でのテスト

### オプション: スワイプ
- [ ] react-swipeable のインストール
- [ ] スワイプハンドラーの実装
- [ ] タブ切り替えロジック
- [ ] スワイプテスト（iOS/Android）
- [ ] デスクトップでスワイプ無効化確認

---

## 完了基準

### 機能要件
- [ ] モバイルで横スクロールなしで全カラムにアクセス可能
- [ ] タブ切り替えが直感的で滑らか
- [ ] デスクトップで4カラム並列表示が維持される
- [ ] 全てのボタンが44px以上のタップエリアを持つ
- [ ] タッチフィードバックが適切に表示される

### 品質要件
- [ ] 320px〜2560pxの全画面幅で正しく表示
- [ ] iOS Safari / Android Chrome で動作確認
- [ ] 60fps の滑らかなアニメーション
- [ ] WCAG AA 準拠のアクセシビリティ
- [ ] lighthouse モバイルスコア 90+ 維持

### ユーザー体験
- [ ] モバイルでの操作ストレスがない
- [ ] タップミスが大幅に減少
- [ ] 直感的で迷わない操作フロー
- [ ] デスクトップ体験が損なわれない

---

## 参考資料

### デザインガイドライン
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/touch-targets)
- [Material Design - Touch Targets](https://m3.material.io/foundations/interaction/states/applying-states#touch-target)
- [WCAG 2.1 - Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

### 技術リソース
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [React Swipeable](https://github.com/FormidableLabs/react-swipeable)
- [CSS @media (hover)](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)

---

## 更新履歴

- 2025-11-07: 初版作成 - モバイル対応改善プラン策定
