# モバイルUI対応実装プラン（タッチ操作重視版）

## 技術仕様の詳細化

### 1. HamburgerMenuコンポーネント

#### 実装仕様

```typescript
interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRepo: () => void;
  onManageColumns: () => void;
  onManageHidden: () => void;
  onRefresh: () => void;
}
```

#### タッチ操作要件

**タッチターゲット:**
- ハンバーガーボタン: 44px × 44px（最小タッチターゲット）
- メニュー項目: 高さ48px以上（項目間に視覚的な区切り）

**操作方法:**
- タップでメニューを開閉
- オーバーレイタップでメニューを閉じる
- Escapeキー: メニューを閉じる（デバイスのバックボタンとの互換性）

**アクセシビリティ（最小限）:**
- ボタン: `aria-expanded="true/false"`, `aria-label="メニューを開く"`
- メニュー: `role="dialog"`, `aria-label="メインメニュー"`

**アニメーション:**
- Framer Motionの`initial`/`animate`/`exit`使用
- `motion-reduce:transition-none`で無効化
- スライドイン: `x: '100%'` → `x: 0`
- オーバーレイ: `opacity: 0` → `1`

### 2. TopBarのモバイル対応

#### 状態管理

```typescript
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
const [isSearchExpanded, setIsSearchExpanded] = useState(false);
const prevBreakpoint = useRef<'mobile' | 'desktop'>('desktop');

// ブレークポイント検出
const isMobile = useMediaQuery('(max-width: 767px)');

useEffect(() => {
  // ブレークポイント跨ぎ時の状態リセット
  if (prevBreakpoint.current === 'mobile' && !isMobile) {
    setIsMobileMenuOpen(false);
    setIsSearchExpanded(false);
  }
  prevBreakpoint.current = isMobile ? 'mobile' : 'desktop';
}, [isMobile]);
```

#### レイアウト構成

**モバイル版（`md:hidden`）**

```tsx
{/* 1行目：ブランドとボタン */}
<div className="flex items-center justify-between">
  <h1 className="text-title-3">DevBoard</h1>
  <button
    aria-expanded={isMobileMenuOpen}
    aria-label="メニューを開く"
    className="w-11 h-11" {/* 44px タッチターゲット */}
  >
    {/* ハンバーガーアイコン */}
  </button>
</div>

{/* 2行目：最終更新時刻（中央寄せ） */}
<div className="flex justify-center">
  <span className="text-caption">最終更新: {timeAgo}</span>
</div>

{/* アコーディオン：検索/ソート/ビュー */}
<Disclosure defaultOpen={false}>
  {({ open }) => (
    <>
      <Disclosure.Button
        aria-expanded={open}
        className="w-full flex justify-between items-center min-h-[44px]"
      >
        <span>フィルター・並び替え</span>
        <ChevronIcon className={open ? 'rotate-180' : ''} />
      </Disclosure.Button>
      <Disclosure.Panel>
        {/* 検索、ソート、保存済みビュー */}
      </Disclosure.Panel>
    </>
  )}
</Disclosure>
```

**PC版（`hidden md:flex`）**
- 現在のレイアウトをそのまま維持
- クラスに`hidden md:flex`を追加

### 3. TabNavigationコンポーネント

#### 実装仕様

```typescript
interface TabNavigationProps {
  columns: ColumnKey[];
  activeTab: ColumnKey;
  onTabChange: (column: ColumnKey) => void;
  counts: Record<ColumnKey, number>;
}
```

#### タッチ操作

**タップ操作:**
- タブをタップして切り替え
- タッチターゲット: 高さ44px以上、幅は均等配分

**スワイプ操作:**
```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => handleNextTab(),
  onSwipedRight: () => handlePrevTab(),
  trackMouse: false, // マウスでは無効（PC環境）
  preventScrollOnSwipe: true,
  delta: 50, // 50px以上のスワイプで反応
});
```

**アクセシビリティ（最小限）:**

```tsx
<div role="tablist" aria-label="リポジトリカラム">
  {columns.map((col) => (
    <button
      key={col}
      role="tab"
      aria-selected={activeTab === col}
      className="min-h-[44px]"
    >
      {col} <span className="badge">{counts[col]}</span>
    </button>
  ))}
</div>

<div role="tabpanel">
  {/* カラム内容 */}
</div>
```

#### アニメーション

```tsx
<motion.div
  key={activeTab}
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{
    duration: 0.2,
    ease: 'easeOut'
  }}
  className="motion-reduce:transition-none"
>
```

#### バッジ数の即時更新

```typescript
// RepoBoardコンポーネント内
const columnCounts = useMemo(() => {
  const filtered = searchAndFilterRepos(allRepos, searchQuery);
  return {
    Active: filtered.filter(r => classifyRepo(r) === 'Active').length,
    Stale: filtered.filter(r => classifyRepo(r) === 'Stale').length,
    Dormant: filtered.filter(r => classifyRepo(r) === 'Dormant').length,
    Archived: filtered.filter(r => classifyRepo(r) === 'Archived').length,
  };
}, [allRepos, searchQuery]);

// TabNavigationにcountsを渡す
<TabNavigation counts={columnCounts} />
```

### 4. RepoBoardのモバイル対応

#### レイアウト構成

```tsx
{/* モバイル版 */}
<div className="md:hidden">
  <TabNavigation
    columns={visibleColumns}
    activeTab={activeTab}
    onTabChange={setActiveTab}
    counts={columnCounts}
  />
  <div className="p-inset-md overflow-y-auto">
    <RepoColumn
      column={activeTab}
      repos={getReposForColumn(activeTab)}
      className="min-w-full" {/* 画面幅いっぱい */}
    />
  </div>
</div>

{/* PC版 */}
<div className="hidden md:flex gap-4 p-4 overflow-x-auto">
  {visibleColumns.map(col => (
    <RepoColumn key={col} column={col} repos={getReposForColumn(col)} />
  ))}
</div>
```

### 5. RepoCardのタッチ最適化

#### レスポンシブボタンサイズ

```tsx
{/* ボタン類：モバイルで44px、PCで既存サイズ維持 */}
<button className="
  w-9 h-9        /* PC: 36px */
  md:w-11 md:h-11 /* モバイル: 44px */
  active:scale-95 /* タッチフィードバック */
  transition-transform
  motion-reduce:transform-none
">
```

#### カード全体のPadding調整

```tsx
<div className="
  p-inset-md      /* モバイル: 16px */
  md:p-inset-sm   /* PC: 12px */
">
```

#### タッチフィードバック

```tsx
<div className="
  active:bg-opacity-90
  active:scale-[0.98]
  transition-all
  motion-reduce:transition-none
">
```

### 6. GlassModalの調整

#### 構造設計

```tsx
<GlassModal className="
  max-h-[90vh]    /* 画面の90%まで */
  flex flex-col   /* Flexboxで制御 */
">
  {/* ヘッダー：固定 */}
  <div className="flex-shrink-0 px-inset-lg py-inset-md border-b">
    <h2>{title}</h2>
    <button
      aria-label="閉じる"
      className="w-11 h-11" {/* 44px タッチターゲット */}
    >
      ×
    </button>
  </div>

  {/* コンテンツ：スクロール可能 */}
  <div className="flex-1 overflow-y-auto px-inset-lg py-inset-md">
    {children}
  </div>

  {/* フッター：固定（ボタンなど） */}
  <div className="flex-shrink-0 px-inset-lg py-inset-md border-t">
    <button className="min-h-[44px]">保存</button>
    <button className="min-h-[44px]">キャンセル</button>
  </div>
</GlassModal>
```

#### スクロール領域の明確化
- `overflow-y-auto`をコンテンツ部のみに適用
- ヘッダー・フッターは`flex-shrink-0`で固定
- スクロールインジケーター（影やグラデーション）をCSS疑似要素で追加

## 実装順序

### Phase 1: 基礎コンポーネント（1.5-2h）

**HamburgerMenuコンポーネント作成**
- スライドインアニメーション（Framer Motion）
- Escapeキーでの閉じる（デバイスバックボタン対応）
- オーバーレイタップでの閉じる
- 基本的な`aria-label`, `aria-expanded`

**TabNavigationコンポーネント作成**
- タップでのタブ切り替え
- スワイプ対応（`react-swipeable`導入）
- 最小限のARIA属性（`role="tablist"`, `aria-selected`）
- タブ切り替えアニメーション（Framer Motion）

### Phase 2: 既存コンポーネント改修（2-3h）

**TopBarのモバイル対応**
- 状態管理（`useMediaQuery`, `useEffect`）
- モバイル/PCレイアウト分岐
- アコーディオン実装（`@headlessui/react` Disclosure使用）
- ハンバーガーボタン（44px タッチターゲット）

**RepoBoardのモバイル対応**
- タブ表示ロジック
- バッジ数計算（`useMemo`）
- レイアウト分岐（モバイル/PC）
- `activeTab`状態管理

### Phase 3: タッチ最適化（1-1.5h）

**RepoCardのタッチ最適化**
- ボタンサイズ調整（モバイル44px、PC36px）
- タッチフィードバック（`active:scale-95`、`active:bg-opacity-90`）
- カードPadding調整（レスポンシブ）

**GlassModalの調整**
- `max-h-[90vh]`設定
- スクロール領域分離（Flexbox使用）
- ヘッダー/フッター固定
- 閉じるボタン44px

### Phase 4: テスト・検証（0.5-1h）

**タッチ操作の検証**
- タッチターゲットサイズ確認（44px以上）
- スワイプジェスチャー動作確認
- タップフィードバック確認
- オーバーレイタップでの閉じる動作確認

**レスポンシブ動作確認**
- ブレークポイント跨ぎ時の状態リセット
- バッジ数の即時更新
- アニメーション動作（`motion-reduce`含む）
- モバイル/PC間のレイアウト切り替え

## 技術スタック追加

### 新規依存パッケージ
- `react-swipeable`: スワイプジェスチャー対応
- `@headlessui/react`: Disclosureコンポーネント（既存？確認必要）

### カスタムフック作成
- `useMediaQuery(query: string): boolean` - ブレークポイント検出

### 削減される機能（実装しない）
- `useFocusTrap` - フォーカストラップフック
- 矢印キー、Home/Endキーでのナビゲーション
- `tabIndex`の細かい制御
- 複雑なARIA属性（`aria-controls`, `aria-labelledby`など）

## 完成条件

### 機能要件
- モバイル（375px〜767px）で全機能がタッチ操作可能
- PC（768px以上）で既存UIが完全に保持される
- タッチターゲットが44px以上（モバイル）
- タブ切り替えでバッジ数が即時更新
- スワイプでタブ切り替え可能
- タップフィードバックが視覚的に明確

### アクセシビリティ要件（最小限）
- 基本的な`aria-label`, `aria-expanded`, `aria-selected`
- `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Escapeキーでメニューを閉じる
- `motion-reduce`でアニメーション無効化

### パフォーマンス要件
- 状態変更時の不要な再レンダリングなし
- `useMemo`でフィルタリング・計算を最適化
- スワイプジェスチャーの遅延なし

## 実装時の注意点

### タッチターゲットの確保
- すべてのインタラクティブ要素（ボタン、リンク、タブ）は44px以上
- 項目間に適切な間隔（8px以上）を確保
- `min-h-[44px]`, `w-11 h-11`などで明示的に指定

### アニメーションのパフォーマンス
- `transform`と`opacity`のみ使用（GPU加速）
- `width`, `height`, `margin`などのレイアウト変更を避ける
- `motion-reduce:transition-none`を必ず追加

### スワイプ操作の設定
- `preventScrollOnSwipe: true`で縦スクロールとの競合を防ぐ
- `delta: 50`で誤操作を防ぐ
- `trackMouse: false`でPC環境では無効化

### ブレークポイント管理
- `useMediaQuery`で検出
- `useEffect`でブレークポイント跨ぎ時の状態リセット
- `useRef`で前回の状態を記憶
