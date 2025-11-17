# DevBoard タグ機能実装計画書

**作成日**: 2025-11-17
**バージョン**: 1.0
**ステータス**: 計画中

## 1. 概要

### 1.1 目的
リポジトリに独自のタグを付与し、タグによる柔軟な検索・フィルタリング・分類を可能にする機能を実装する。

### 1.2 スコープ
- **実装対象**: タグ付け機能の完全実装（データモデル、UI、検索機能）
- **実装方式**: 独自タグシステム（ローカルストレージのみ、GitHub API書き込みなし）
- **対象単位**: リポジトリ単位
- **今回の範囲外**: AI統合、ToDo機能、モバイルUI、Issue/PR作成

### 1.3 成功基準
- ✅ タグの作成・編集・削除が可能
- ✅ リポジトリへのタグ割り当て・解除が可能
- ✅ タグによる検索・フィルタリングが動作
- ✅ タグ状態がプリセットに保存可能
- ✅ アカウント別にタグが管理される
- ✅ デザインシステムに準拠したUI

---

## 2. アーキテクチャ設計

### 2.1 データモデル

```typescript
// src/types/tag.ts

/**
 * タグ定義
 */
export type Tag = {
  id: string;              // UUID
  name: string;            // 表示名（例: "優先", "実験的"）
  color: string;           // HEX色コード（例: "#FF5733"）
  createdAt: string;       // ISO 8601形式
};

/**
 * リポジトリタグマッピング
 * キー: リポジトリID（repo.id）
 * 値: タグIDの配列
 */
export type RepoTagsMap = Record<string, string[]>;

/**
 * タグフィルター設定（プリセット用）
 */
export type TagFilter = {
  tagIds: string[];        // 選択されたタグID
  mode: 'AND' | 'OR';      // 複数タグの結合モード（デフォルト: AND）
};
```

### 2.2 ストレージ設計

#### 2.2.1 容量分析と制限対策

**容量見積もり:**
```typescript
// Tag 1件: ~100B（name: 20文字、color: 7文字、id: 36文字、timestamp）
// Tag 100件: ~10KB
// RepoTagsMap（1000リポジトリ、各5タグ）: ~55KB
// 合計: ~65KB（5MB制限に対して十分余裕あり）

// 上限想定:
// Tag: 最大200件 → ~20KB
// RepoTagsMap: 最大2000リポジトリ → ~110KB
// 合計: ~130KB（それでも5MB制限の 2.6%）
```

**容量制限対策:**
- タグ数が200件を超えたら警告表示
- 未使用タグ（どのリポジトリにも割り当てられていない）の自動削除提案
- タグ名の最大文字数制限（20文字）

#### 2.2.2 ストレージオプション比較

| 項目 | localStorage | Cloudflare KV | GitHub Topics |
|------|-------------|---------------|---------------|
| **容量** | ~5MB | 実質無制限 | GitHub制限内 |
| **同期** | なし | グローバル | GitHub連携 |
| **自由度** | 完全自由 | 完全自由 | 制限あり（小文字、ハイフン）|
| **可視性** | アプリ内のみ | アプリ内のみ | GitHub上でも表示 |
| **コスト** | 無料 | 読み$0.50/1M | 無料（API制限あり） |
| **適用** | MVP | Post-MVP | 将来の統合候補 |

#### 2.2.3 MVP ストレージ戦略

**Phase 1 (MVP):**
- **タグ定義**: `localStorage`
  - キー: `github-dashboard-tags:{accountId}`
  - 値: `Tag[]`（最大200件）

- **タグマッピング**: `localStorage`
  - キー: `github-dashboard-repo-tags:{accountId}`
  - 値: `RepoTagsMap`

**Phase 2 (Post-MVP):**
- **Cloudflare KV 同期**:
  - 複数端末での同期
  - タグ定義とマッピングをKVに保存
  - ローカルキャッシュとの併用

**Phase 3 (将来の統合):**
- **GitHub Topics との統合**:
  - DevBoardタグ → GitHub Topics へのエクスポート
  - GitHub Topics → DevBoardタグ へのインポート
  - 双方向同期オプション

#### 2.2.4 ストレージキー設計

**キー:**
- `github-dashboard-tags:{accountId}` → `Tag[]`
- `github-dashboard-repo-tags:{accountId}` → `RepoTagsMap`
- `github-dashboard-tag-filter:{accountId}` → `TagFilter`（最後のフィルター状態）

**アカウント切り替え対応:**
- `useAuth()`からcurrentAccountIdを取得
- アカウントごとに独立したタグ空間を管理

#### 2.2.5 移行インターフェース設計

将来的な KV/GitHub Topics 移行に備え、ストレージアクセスを抽象化：

```typescript
// src/utils/tagStorage.ts
interface TagStorageAdapter {
  getTags(accountId: string): Promise<Tag[]>;
  saveTags(accountId: string, tags: Tag[]): Promise<void>;
  getRepoTags(accountId: string): Promise<RepoTagsMap>;
  saveRepoTags(accountId: string, repoTags: RepoTagsMap): Promise<void>;
}

// MVP実装: LocalStorage adapter
class LocalStorageTagAdapter implements TagStorageAdapter { ... }

// 将来: KV adapter
class CloudflareKVTagAdapter implements TagStorageAdapter { ... }

// 将来: GitHub Topics adapter
class GitHubTopicsAdapter implements TagStorageAdapter {
  async getTags(accountId: string): Promise<Tag[]> {
    // GitHub Topics を Tag 形式に変換
  }
  // ...
}
```

### 2.3 コンポーネント構成

```
App
├── TopBar
│   ├── SearchBox
│   ├── TagFilter (NEW)       // タグ絞り込みUI
│   ├── SortSelector
│   └── PresetSelector
├── RepoBoard
│   └── RepoColumn
│       └── RepoCard
│           ├── RepoInfo
│           ├── TagBadgeList (NEW)  // タグバッジ表示
│           └── TagEditButton (NEW) // タグ編集ボタン
└── Modals
    ├── TagManager (NEW)      // タグ管理モーダル
    └── TagSelector (NEW)     // タグ選択モーダル
```

---

## 3. 実装フェーズ

### フェーズ1: データ層・ストレージ (1-1.5h)

#### タスク
1. **型定義作成** (`src/types/tag.ts`)
   - Tag, RepoTagsMap, TagFilter型の定義

2. **ストレージユーティリティ** (`src/utils/tagStorage.ts`)
   ```typescript
   // 主要な関数
   - getTags(accountId: string): Tag[]
   - saveTags(accountId: string, tags: Tag[]): void
   - createTag(accountId: string, name: string, color: string): Tag
   - updateTag(accountId: string, tagId: string, updates: Partial<Tag>): void
   - deleteTag(accountId: string, tagId: string): void

   - getRepoTags(accountId: string): RepoTagsMap
   - saveRepoTags(accountId: string, repoTags: RepoTagsMap): void
   - assignTagToRepo(accountId: string, repoId: string, tagId: string): void
   - removeTagFromRepo(accountId: string, repoId: string, tagId: string): void
   - getTagsForRepo(accountId: string, repoId: string): string[]
   ```

3. **カスタムフック** (`src/hooks/useTags.ts`)
   ```typescript
   export function useTags() {
     const { currentAccount } = useAuth();
     const [tags, setTags] = useState<Tag[]>([]);
     const [repoTags, setRepoTags] = useState<RepoTagsMap>({});

     // CRUD操作
     // タグ一覧取得、作成、更新、削除
     // リポジトリへのタグ割り当て・解除

     return { tags, repoTags, createTag, updateTag, deleteTag, ... };
   }
   ```

#### 成果物
- `src/types/tag.ts`
- `src/utils/tagStorage.ts`
- `src/hooks/useTags.ts`

---

### フェーズ2: UIコンポーネント (2-2.5h)

#### 2.1 TagBadge コンポーネント

**ファイル**: `src/components/TagBadge.tsx`

**Props:**
```typescript
type TagBadgeProps = {
  tag: Tag;
  size?: 'sm' | 'md';
  onRemove?: () => void;        // 削除ボタン表示時
  onClick?: () => void;         // クリック可能な場合
  className?: string;
};
```

**デザイン仕様:**
- 背景色: `tag.color` (20%透過)
- テキスト色: `tag.color`（コントラスト確保）
- フォント: `text-caption` (11px/16px)
- パディング: `px-2 py-0.5` (inset-xs相当)
- 角丸: `rounded-full`
- ホバー: 背景色30%透過 + `focusRing`
- 削除ボタン: ×アイコン、ホバーで強調

#### 2.2 TagManager モーダル

**ファイル**: `src/components/TagManager.tsx`

**機能:**
- タグ一覧表示（色と名前）
- 新規タグ作成フォーム
  - 名前入力（必須、最大20文字）
  - 色選択（カラーピッカーまたはプリセット）
- タグ編集（名前・色変更）
- タグ削除（確認ダイアログ付き）
- 使用中タグには警告表示（削除時）

**UI構成:**
```
┌─────────────────────────────────┐
│ タグ管理              [×]        │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [+] 新しいタグを作成         │ │
│ │   名前: [_____________]      │ │
│ │   色:   [🎨] [プリセット]   │ │
│ │         [作成]               │ │
│ └─────────────────────────────┘ │
│                                 │
│ 既存のタグ (5)                  │
│ ┌─────────────────────────────┐ │
│ │ [優先] 🟥  3件   [編集][削除]│ │
│ │ [実験的] 🟦 1件  [編集][削除]│ │
│ │ [保留] 🟨  0件   [編集][削除]│ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**デザイン:**
- GlassModal使用（既存のモーダルコンポーネント）
- メタリックエフェクト（--metallic-noise）
- アニメーション: Framer Motion (fadeIn, stagger)

#### 2.3 TagSelector モーダル

**ファイル**: `src/components/TagSelector.tsx`

**Props:**
```typescript
type TagSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  repoName: string;
  currentTagIds: string[];
};
```

**機能:**
- 利用可能なタグ一覧表示（チェックボックス）
- 複数選択可能
- 新規タグ作成（クイック作成フォーム）
- 保存ボタンでタグ割り当て更新

**UI構成:**
```
┌─────────────────────────────────┐
│ タグを選択 - owner/repo-name [×]│
├─────────────────────────────────┤
│ ☑ 優先 🟥                        │
│ ☐ 実験的 🟦                      │
│ ☑ 保留 🟨                        │
│                                 │
│ [+ 新しいタグを作成]            │
│                                 │
│              [キャンセル] [保存]│
└─────────────────────────────────┘
```

#### 成果物
- `src/components/TagBadge.tsx`
- `src/components/TagManager.tsx`
- `src/components/TagSelector.tsx`

---

### フェーズ3: RepoCard統合 (1-1.5h)

#### 修正ファイル: `src/components/RepoCard.tsx`

**追加内容:**

1. **タグ表示エリア追加**
   - カード下部にタグバッジリスト表示
   - 最大3個表示、超える場合は「+N」バッジ
   - クリックでTagSelectorモーダル開く

2. **タグ編集ボタン追加**
   - カードホバー時に表示（右上コーナー）
   - タグアイコン（🏷️）
   - クリックでTagSelectorモーダル開く

3. **レイアウト調整**
   ```
   ┌─────────────────────────────┐
   │ owner/repo-name    [🏷️]    │
   │ 説明文...                    │
   │ TypeScript  ⭐123           │
   │                             │
   │ [優先] [実験的] [+2]        │  ← NEW
   │                             │
   │ 3d ago                      │
   └─────────────────────────────┘
   ```

4. **状態管理**
   - `useTags()`フックでタグ情報取得
   - TagSelectorの開閉状態管理
   - タグ更新時にToast通知

#### 成果物
- 修正: `src/components/RepoCard.tsx`

---

### フェーズ4: 検索・フィルタリング (1.5-2h)

#### 4.1 検索ロジック拡張

**修正ファイル**: `src/utils/search.ts`

**追加関数:**
```typescript
/**
 * タグIDでリポジトリをフィルタリング
 */
export function filterReposByTags(
  repos: Repo[],
  tagFilter: TagFilter,
  repoTags: RepoTagsMap
): Repo[] {
  if (tagFilter.tagIds.length === 0) return repos;

  return repos.filter(repo => {
    const repoTagIds = repoTags[repo.id] || [];

    if (tagFilter.mode === 'AND') {
      // すべてのタグを含む
      return tagFilter.tagIds.every(tagId => repoTagIds.includes(tagId));
    } else {
      // いずれかのタグを含む
      return tagFilter.tagIds.some(tagId => repoTagIds.includes(tagId));
    }
  });
}
```

**既存関数修正:**
- `searchAndSortRepos()`にタグフィルター引数追加

#### 4.2 TopBar拡張

**修正ファイル**: `src/components/TopBar.tsx`

**追加UI:**

1. **タグフィルターボタン**
   - 検索ボックスの右側に配置
   - タグアイコン + バッジ（選択中タグ数）
   - クリックでドロップダウン展開

2. **タグフィルタードロップダウン**
   ```
   ┌─────────────────────────────┐
   │ タグで絞り込み              │
   ├─────────────────────────────┤
   │ ☑ 優先 🟥                    │
   │ ☐ 実験的 🟦                  │
   │ ☑ 保留 🟨                    │
   ├─────────────────────────────┤
   │ モード: ● AND  ○ OR         │
   ├─────────────────────────────┤
   │ [クリア]     [タグ管理]     │
   └─────────────────────────────┘
   ```

3. **状態管理**
   - `selectedTagIds: string[]`
   - `tagFilterMode: 'AND' | 'OR'`
   - RepoBoard親コンポーネントに伝播

#### 4.3 プリセット対応

**修正ファイル**:
- `src/types/index.ts` (ViewPreset型)
- `src/utils/presetStorage.ts`

**ViewPreset型拡張:**
```typescript
export type ViewPreset = {
  // ... 既存フィールド
  tagFilter?: TagFilter;  // NEW: タグフィルター設定
};
```

**プリセット保存時:**
- 現在のタグフィルター状態を含める
- プリセット読み込み時にタグフィルター復元

#### 成果物
- 修正: `src/utils/search.ts`
- 修正: `src/components/TopBar.tsx`
- 修正: `src/types/index.ts`
- 修正: `src/utils/presetStorage.ts`

---

### フェーズ5: 仕上げ・テスト (1h)

#### 5.1 エッジケース対応

1. **タグ削除時の整合性**
   - 削除されたタグIDをrepoTagsから除去
   - 使用中タグ削除時に確認ダイアログ表示
   - 「N件のリポジトリで使用中です。削除しますか？」

2. **タグ名の重複チェック**
   - 同名タグの作成を防止
   - 編集時も重複チェック

3. **空白・特殊文字の処理**
   - タグ名のトリム処理
   - 最小1文字、最大20文字制限

4. **アカウント切り替え時**
   - タグ状態のクリーンアップ
   - 新アカウントのタグ読み込み

#### 5.2 アクセシビリティ

1. **ARIA属性**
   - `aria-label`: すべてのタグボタンに説明追加
   - `aria-live="polite"`: タグ追加・削除時の通知
   - `role="checkbox"`: タグ選択UIに適切なrole

2. **キーボード操作**
   - Tab: フォーカス移動
   - Enter/Space: タグ選択・解除
   - Escape: モーダル閉じる
   - `focusRing`適用

3. **スクリーンリーダー対応**
   - タグ色の代替テキスト提供
   - 操作結果の音声フィードバック

#### 5.3 パフォーマンス

1. **useMemo最適化**
   - タグフィルタリング結果をキャッシュ
   - 依存配列の適切な設定

2. **大量データ対応**
   - 100+ タグ、1000+ リポジトリでの動作確認
   - 仮想スクロール検討（必要に応じて）

#### 5.4 ユーザーフィードバック

**Toast通知:**
- ✅ タグ作成: 「タグ "優先" を作成しました」
- ✅ タグ削除: 「タグ "優先" を削除しました」
- ✅ タグ割り当て: 「owner/repo にタグを追加しました」
- ❌ エラー: 「同名のタグが既に存在します」

#### 成果物
- エッジケース処理の実装
- アクセシビリティ改善
- パフォーマンス最適化
- Toast通知の統合

---

## 4. 技術仕様詳細

### 4.1 カラーパレット（タグ色プリセット）

```typescript
export const TAG_COLOR_PRESETS = [
  { name: '赤', value: '#EF4444' },      // Tailwind red-500
  { name: 'オレンジ', value: '#F97316' }, // orange-500
  { name: '黄', value: '#EAB308' },      // yellow-500
  { name: '緑', value: '#22C55E' },      // green-500
  { name: '青', value: '#3B82F6' },      // blue-500
  { name: '紫', value: '#A855F7' },      // purple-500
  { name: 'ピンク', value: '#EC4899' },   // pink-500
  { name: 'グレー', value: '#6B7280' },   // gray-500
];
```

### 4.2 デザインシステム準拠

**適用ルール:**
- Typography: `text-caption` (TagBadge), `text-body-sm` (モーダル)
- Spacing: `gap-inline-sm`, `p-inset-md`
- Focus: `focusRing` preset適用
- Motion: `motion-reduce:animate-none`
- Metallic: モーダルのみ使用（カードのタグには不使用）

### 4.3 ストレージ容量見積もり

**想定データ量:**
- タグ数: 最大50個
- リポジトリ数: 最大1000個
- 1タグあたり: ~100 bytes
- 1リポジトリタグマッピング: ~50 bytes

**合計:** ~55KB（localStorageの5MB制限内で余裕あり）

### 4.5 検索統合仕様

#### 4.5.1 フィルタ適用順序

**実行順序:**
```
1. リポジトリデータ取得（GitHub API or キャッシュ）
   ↓
2. テキスト検索フィルタ適用
   （nameWithOwner, description, primaryLanguage, topics を検索）
   ↓
3. タグフィルタ適用
   （選択されたタグに一致するリポジトリのみ）
   ↓
4. ソート適用
   （Last Updated / Name）
   ↓
5. カラム分類
   （Active / Stale / Dormant / Archived）
```

**実装:**
```typescript
function filterAndSortRepos(
  repos: Repo[],
  searchQuery: string,
  tagFilter: TagFilter | null,
  sortOrder: SortOrder
): Repo[] {
  let filtered = repos;

  // 1. テキスト検索
  if (searchQuery) {
    filtered = filterReposByText(filtered, searchQuery);
  }

  // 2. タグフィルタ
  if (tagFilter && tagFilter.tagIds.length > 0) {
    filtered = filterReposByTags(filtered, tagFilter);
  }

  // 3. ソート
  filtered = sortRepos(filtered, sortOrder);

  return filtered;
}
```

#### 4.5.2 タグフィルタロジック（AND/OR）

**AND モード（デフォルト）:**
```typescript
function filterReposByTags_AND(repos: Repo[], tagFilter: TagFilter): Repo[] {
  const { tagIds } = tagFilter;
  return repos.filter(repo => {
    const repoTagIds = getTagsForRepo(repo.id);
    // すべてのタグが含まれているかチェック
    return tagIds.every(tagId => repoTagIds.includes(tagId));
  });
}
```

**OR モード:**
```typescript
function filterReposByTags_OR(repos: Repo[], tagFilter: TagFilter): Repo[] {
  const { tagIds } = tagFilter;
  return repos.filter(repo => {
    const repoTagIds = getTagsForRepo(repo.id);
    // いずれかのタグが含まれているかチェック
    return tagIds.some(tagId => repoTagIds.includes(tagId));
  });
}
```

#### 4.5.3 URLクエリへの反映

**URL形式:**
```
/dashboard?search=react&tags=tag1,tag2&tagMode=AND&sort=updated
```

**実装:**
```typescript
// URLパラメータからフィルター状態を復元
function parseFiltersFromURL(searchParams: URLSearchParams): Filters {
  return {
    searchQuery: searchParams.get('search') || '',
    tagFilter: {
      tagIds: searchParams.get('tags')?.split(',').filter(Boolean) || [],
      mode: (searchParams.get('tagMode') as 'AND' | 'OR') || 'AND',
    },
    sortOrder: (searchParams.get('sort') as SortOrder) || 'updated',
  };
}

// フィルター状態をURLに反映
function updateURLFromFilters(filters: Filters) {
  const params = new URLSearchParams();

  if (filters.searchQuery) {
    params.set('search', filters.searchQuery);
  }

  if (filters.tagFilter.tagIds.length > 0) {
    params.set('tags', filters.tagFilter.tagIds.join(','));
    params.set('tagMode', filters.tagFilter.mode);
  }

  if (filters.sortOrder) {
    params.set('sort', filters.sortOrder);
  }

  window.history.replaceState({}, '', `?${params.toString()}`);
}
```

#### 4.5.4 パフォーマンス最適化

**大量リポジトリ対応（1000+件）:**
```typescript
// useMemo でフィルタリング結果をキャッシュ
const filteredRepos = useMemo(() => {
  return filterAndSortRepos(repos, searchQuery, tagFilter, sortOrder);
}, [repos, searchQuery, tagFilter, sortOrder]);

// タグマッピングを Map 構造に変換して高速化
const repoTagsMap = useMemo(() => {
  const map = new Map<string, string[]>();
  Object.entries(repoTags).forEach(([repoId, tagIds]) => {
    map.set(repoId, tagIds);
  });
  return map;
}, [repoTags]);

// O(n) の検索アルゴリズム
function getTagsForRepo(repoId: string): string[] {
  return repoTagsMap.get(repoId) || [];
}
```

**ベンチマーク目標:**
- 100リポジトリ: <10ms
- 1000リポジトリ: <50ms
- 10000リポジトリ: <200ms（将来対応）

#### 4.5.5 UI フィードバック

**フィルタ適用中の表示:**
```typescript
// フィルタ結果が0件の場合
if (filteredRepos.length === 0 && (searchQuery || tagFilter.tagIds.length > 0)) {
  return (
    <EmptyState
      icon="🔍"
      title="該当するリポジトリが見つかりません"
      message={
        <>
          検索条件: {searchQuery && `"${searchQuery}"`}
          {tagFilter.tagIds.length > 0 && (
            <div>
              タグ: {tagFilter.tagIds.map(id => tags.find(t => t.id === id)?.name).join(', ')}
              ({tagFilter.mode})
            </div>
          )}
        </>
      }
      actions={[
        { label: 'フィルタをクリア', onClick: clearFilters },
      ]}
    />
  );
}
```

### 4.6 アクセシビリティ強化

#### 4.6.1 色コントラストチェック

**WCAG 2.1 AA 基準:**
- 通常テキスト: 4.5:1 以上
- 大きなテキスト（18pt以上）: 3:1 以上

**実装:**
```typescript
// src/utils/colorContrast.ts

/**
 * 相対輝度を計算
 */
function getLuminance(hexColor: string): number {
  const rgb = parseInt(hexColor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * コントラスト比を計算
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 読みやすい前景色を自動計算
 */
function getReadableForeground(backgroundColor: string): string {
  const whiteContrast = getContrastRatio(backgroundColor, '#FFFFFF');
  const blackContrast = getContrastRatio(backgroundColor, '#000000');

  // AA基準（4.5:1）を満たす色を選択
  if (whiteContrast >= 4.5) return '#FFFFFF';
  if (blackContrast >= 4.5) return '#000000';

  // どちらも基準を満たさない場合、より高いコントラストを選択
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}
```

**UI適用:**
```typescript
// TagBadge コンポーネント
function TagBadge({ tag }: TagBadgeProps) {
  const foregroundColor = getReadableForeground(tag.color);
  const contrast = getContrastRatio(tag.color, foregroundColor);

  return (
    <span
      className="tag-badge"
      style={{
        backgroundColor: tag.color + '33', // 20%透過
        color: foregroundColor,
        borderColor: tag.color,
      }}
      aria-label={`タグ: ${tag.name}${contrast < 4.5 ? ' (低コントラスト)' : ''}`}
    >
      {tag.name}
    </span>
  );
}
```

#### 4.6.2 タグ名重複検証

**実装:**
```typescript
// src/utils/tagValidation.ts

/**
 * タグ名の重複チェック
 */
function isDuplicateTagName(name: string, existingTags: Tag[], excludeId?: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  return existingTags.some(
    tag => tag.id !== excludeId && tag.name.trim().toLowerCase() === normalizedName
  );
}

/**
 * タグ名のバリデーション
 */
function validateTagName(name: string, existingTags: Tag[], excludeId?: string): string | null {
  // 空チェック
  if (!name.trim()) {
    return 'タグ名を入力してください';
  }

  // 長さチェック
  if (name.length > 20) {
    return 'タグ名は20文字以内で入力してください';
  }

  // 重複チェック
  if (isDuplicateTagName(name, existingTags, excludeId)) {
    return 'このタグ名は既に使用されています';
  }

  // 特殊文字チェック（オプション）
  if (/[<>"/\\]/.test(name)) {
    return 'タグ名に使用できない文字が含まれています';
  }

  return null; // バリデーションOK
}
```

**UI適用:**
```typescript
// TagManager コンポーネント
function TagManager() {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const { tags, createTag } = useTags();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    const validationError = validateTagName(name, tags);
    if (validationError) {
      setError(validationError);
      return;
    }

    createTag(name, color);
    setName('');
    setError(null);
  };

  return (
    <div>
      <input
        value={name}
        onChange={e => {
          setName(e.target.value);
          setError(null);
        }}
        onBlur={() => {
          const validationError = validateTagName(name, tags);
          setError(validationError);
        }}
        aria-invalid={!!error}
        aria-describedby={error ? 'tag-name-error' : undefined}
      />
      {error && (
        <div id="tag-name-error" role="alert" className="text-error">
          {error}
        </div>
      )}
    </div>
  );
}
```

#### 4.6.3 キーボードナビゲーション

**実装仕様:**
| 操作 | ショートカット | 動作 |
|------|--------------|------|
| タグ管理を開く | `Shift+T` | TagManager モーダルを開く |
| タグフィルタ開く | `Shift+F` | TagFilter ドロップダウンを開く |
| モーダルを閉じる | `Escape` | 開いているモーダルを閉じる |
| フォーカス移動 | `Tab` / `Shift+Tab` | 次/前の要素にフォーカス |
| 選択 | `Enter` / `Space` | タグ選択・ボタン実行 |
| タグ削除 | `Delete` | フォーカス中のタグを削除（確認あり） |

**実装:**
```typescript
// グローバルキーボードショートカット
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Shift+T: タグ管理
    if (e.shiftKey && e.key === 'T') {
      e.preventDefault();
      setTagManagerOpen(true);
    }

    // Shift+F: タグフィルタ
    if (e.shiftKey && e.key === 'F') {
      e.preventDefault();
      setTagFilterOpen(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 5. テストシナリオ

### 5.1 機能テスト

1. **タグCRUD**
   - [ ] タグ作成（正常系）
   - [ ] タグ編集（名前・色変更）
   - [ ] タグ削除（未使用）
   - [ ] タグ削除（使用中、確認ダイアログ）
   - [ ] 重複タグ名エラー

2. **タグ割り当て**
   - [ ] リポジトリにタグ追加
   - [ ] リポジトリからタグ削除
   - [ ] 複数タグの同時割り当て
   - [ ] タグなしリポジトリの表示

3. **検索・フィルタリング**
   - [ ] 単一タグでフィルタ
   - [ ] 複数タグ AND検索
   - [ ] 複数タグ OR検索
   - [ ] タグ + テキスト検索の併用
   - [ ] フィルタークリア

4. **プリセット**
   - [ ] タグフィルター含むプリセット保存
   - [ ] プリセット読み込み（タグフィルター復元）
   - [ ] プリセット削除

5. **アカウント切り替え**
   - [ ] アカウントAのタグがアカウントBで見えない
   - [ ] 切り替え後の正しいタグ表示

### 5.2 UIテスト

1. **レスポンシブ**
   - [ ] デスクトップ表示
   - [ ] タブレット表示（将来対応）
   - [ ] モバイル表示（将来対応）

2. **アクセシビリティ**
   - [ ] キーボード操作（Tab, Enter, Escape）
   - [ ] スクリーンリーダー（NVDA/JAWS確認）
   - [ ] フォーカス表示
   - [ ] カラーコントラスト（WCAG AA準拠）

3. **パフォーマンス**
   - [ ] 50タグ + 500リポジトリで遅延なし
   - [ ] フィルタリング応答時間 < 100ms

---

## 6. マイルストーン

| フェーズ | 完了条件 | 見積もり |
|---------|---------|---------|
| Phase 1 | ストレージ層が動作、単体テスト通過 | 1-1.5h |
| Phase 2 | 全UIコンポーネントが単体で動作 | 2-2.5h |
| Phase 3 | RepoCardにタグ表示・編集可能 | 1-1.5h |
| Phase 4 | タグフィルタリングが動作、プリセット保存可 | 1.5-2h |
| Phase 5 | 全テストシナリオ通過、本番投入可能 | 1h |

**合計見積もり: 6.5-8時間**

---

## 7. 将来の拡張計画（今回は実装しない）

### 7.1 GitHub topics連携
- GitHub APIでtopics読み取り
- topicsをタグとして自動インポート
- 書き込み対応（オプトイン）

### 7.2 タグの階層化
- 親タグ・子タグの関係
- 例: 「バックエンド > API > 認証」

### 7.3 スマートタグ
- 自動タグ付け（言語、activity、stars基準）
- AI推薦タグ

### 7.4 タグベースのビュー
- タグごとに専用カラム生成
- 「優先」タグの専用ボード表示

---

## 8. リスク管理

| リスク | 影響度 | 対策 |
|-------|-------|------|
| localStorage容量不足 | 低 | 見積もり55KB、5MB制限内で余裕あり |
| パフォーマンス劣化（大量タグ） | 中 | useMemo最適化、仮想スクロール検討 |
| デザイン一貫性の欠如 | 中 | デザインシステム厳守、レビュー必須 |
| アクセシビリティ不足 | 高 | ARIA属性、キーボード操作を初期実装 |
| 既存機能への影響 | 中 | プリセット型拡張は後方互換性確保 |

---

## 9. 実装時の注意事項

### 9.1 必須確認事項
- [ ] 既存のpresetStorage.tsとの整合性確認
- [ ] AuthContextのcurrentAccount取得方法確認
- [ ] GlassModalコンポーネントのprops確認
- [ ] focusRingの適用パターン確認

### 9.2 コーディング規約
- TypeScript strictモード準拠
- ESLint/Prettier設定に従う
- コンポーネントは関数コンポーネント + hooks
- propsの型定義を必ず記述
- useMemo/useCallbackで最適化

### 9.3 コミット戦略
- フェーズごとにコミット
- コミットメッセージ形式: `feat(tags): [Phase N] 説明`
- 例: `feat(tags): [Phase 1] Add tag storage utilities`

### 9.4 MVPスコープ定義

#### 🎯 MVP (Phase 1+2) - 3-4時間

**目標**: 基本的なタグ管理と表示機能

**含まれる機能:**
- ✅ タグのCRUD（作成・編集・削除）
- ✅ リポジトリへのタグ割り当て
- ✅ TagBadge 表示
- ✅ TagManager モーダル（シンプル版）
- ✅ localStorage ストレージ
- ✅ アカウント別管理

**実装フェーズ:**
- フェーズ1: データ層・ストレージ - 1-1.5h
- フェーズ2: UIコンポーネント（簡略版）- 2-2.5h
  - TagBadge
  - TagManager（色選択はプリセットのみ）
  - RepoCard への TagBadge 統合

**除外する機能（V1.1以降）:**
- ❌ タグによる検索・フィルタリング
- ❌ AND/OR モード切り替え
- ❌ プリセットへのタグ保存
- ❌ 高度な色選択（カラーピッカー）
- ❌ タグ統計表示
- ❌ キーボードショートカット

**成功基準:**
- [ ] タグを作成・編集・削除できる
- [ ] リポジトリにタグを割り当てられる
- [ ] リポジトリカードにタグバッジが表示される
- [ ] アカウント切り替え時に正しいタグが表示される

#### 🚀 V1.1 (Phase 3+4) - 2.5-4時間

**目標**: 検索・フィルタリング機能の追加

**追加機能:**
- ✅ タグによる検索・フィルタリング
- ✅ AND/OR モード切り替え
- ✅ TopBar への TagFilter 統合
- ✅ URL クエリへの反映
- ✅ プリセットへのタグフィルター保存

**実装フェーズ:**
- フェーズ3: RepoCard 統合（TagFilter追加）- 1-1.5h
- フェーズ4: 検索・フィルタリング - 1.5-2h
- フェーズ5: ポリッシュ（部分）- 1h

**成功基準:**
- [ ] タグでリポジトリをフィルタリングできる
- [ ] AND/OR モードを切り替えられる
- [ ] タグフィルターをプリセットに保存できる
- [ ] URL からフィルター状態を復元できる

#### 🌟 V2.0 (Phase 5+拡張) - 2-3時間

**目標**: 高度な機能と GitHub Topics 統合

**追加機能:**
- ✅ カラーピッカーによる自由な色選択
- ✅ タグ統計表示（使用数、人気度）
- ✅ キーボードショートカット
- ✅ GitHub Topics との同期（インポート/エクスポート）
- ✅ Cloudflare KV によるマルチデバイス同期（オプション）

**実装フェーズ:**
- フェーズ5（完全版）: ポリッシュ＆テスト - 1h
- 追加: GitHub Topics 統合 - 1-2h
- 追加: KV ストレージ移行 - 1h（オプション）

**成功基準:**
- [ ] 自由に色を選択できる
- [ ] タグの使用状況を確認できる
- [ ] GitHub Topics と同期できる

#### 優先順位付けマトリクス

| 機能 | 価値 | 複雑度 | 依存性 | 優先度 |
|------|-----|-------|--------|--------|
| タグCRUD | 高 | 低 | なし | **MVP** |
| TagBadge 表示 | 高 | 低 | なし | **MVP** |
| リポジトリへの割り当て | 高 | 低 | MVP | **MVP** |
| タグフィルタリング | 高 | 中 | MVP | **V1.1** |
| AND/OR モード | 中 | 低 | V1.1 | **V1.1** |
| プリセット連携 | 中 | 低 | V1.1 | **V1.1** |
| カラーピッカー | 低 | 低 | MVP | **V2.0** |
| GitHub Topics 同期 | 低 | 高 | MVP | **V2.0** |
| マルチデバイス同期 | 低 | 中 | V1.1 | **V2.0** |

#### 時間見積もり調整

**元の見積もり**: 6.5-8時間（全5フェーズ）

**MVP見積もり**: 3-4時間（2フェーズのみ）

**削減内容:**
- 検索・フィルタリング: -1.5~2h → V1.1へ
- プリセット連携: -0.5h → V1.1へ
- 高度な色選択: -0.5h → V2.0へ
- ポリッシュ＆テスト: -1h → V1.1/V2.0へ

#### 段階的リリース計画

**Week 1: MVP開発**
- タグCRUD + 基本表示のみ
- シンプルな UI
- 内部テスト・フィードバック収集

**Week 2: V1.1開発**
- 検索・フィルタリング追加
- プリセット連携
- 実際のワークフローで利用開始

**Week 3+: V2.0開発**
- GitHub Topics 統合
- 高度な機能追加
- マルチデバイス同期（オプション）

---

## 10. 参考資料

- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体のガイドライン
- [デザインシステム](../src/lib/designSystem.ts) - UIトークン定義
- [既存ストレージ実装](../src/utils/storage.ts) - ストレージパターン
- [既存プリセット実装](../src/utils/presetStorage.ts) - プリセット管理
- [GitHub Topics API](https://docs.github.com/en/rest/repos/repos#replace-all-repository-topics) - 将来の連携用

---

**ドキュメント終了**
