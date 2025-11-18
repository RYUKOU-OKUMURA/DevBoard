# タグ機能の実装まとめ

## 概要

DevBoardにリポジトリにタグを付けて管理できる機能を実装しました。タグはリポジトリの分類や検索に使用でき、リアルタイムで更新が反映されます。

## 機能一覧

### 1. タグの作成・編集・削除
- **TagManagerコンポーネント**: タグの一括管理が可能
  - タグの作成（名前、色の設定）
  - タグの編集（名前、色の変更）
  - タグの削除（使用中のタグは確認ダイアログ表示）
  - タグの使用状況表示

### 2. リポジトリへのタグ付与
- **TagSelectorコンポーネント**: リポジトリごとにタグを選択
  - 既存タグの選択/解除
  - クイック作成機能（タグ選択画面から直接作成可能）
  - 複数タグの同時設定

### 3. タグの表示
- **RepoCardコンポーネント**: リポジトリカードにタグを表示
  - メタデータ部分（言語、スター数、最終更新日など）にタグを表示
  - 最大3個まで表示、それ以上は「+N」で表示
  - タグをクリックするとタグ編集モーダルが開く
  - タグの色に基づいた視覚的な表示

### 4. タグ検索機能
- **検索機能**: リポジトリ検索にタグ検索を追加
  - タグ名でリポジトリを検索可能
  - 既存の検索対象（名前、言語、トピック、説明）と組み合わせて検索可能
  - 部分一致検索に対応

### 5. リアルタイム更新
- **TagsContext**: Context APIを使用した状態管理
  - タグの作成・更新・削除が即座に全コンポーネントに反映
  - リロード不要でUIが更新される

## アーキテクチャ

### ファイル構成

```
src/
├── contexts/
│   └── TagsContext.tsx          # タグ状態管理のContext
├── components/
│   ├── TagManager.tsx           # タグ管理モーダル
│   ├── TagSelector.tsx          # タグ選択モーダル
│   ├── TagBadge.tsx             # タグバッジコンポーネント
│   └── RepoCard.tsx             # リポジトリカード（タグ表示）
├── hooks/
│   └── useTags.ts               # タグ管理フック（非推奨、TagsContextを使用）
├── types/
│   └── tag.ts                   # タグの型定義
├── utils/
│   ├── tagStorage.ts            # タグの永続化（localStorage）
│   └── search.ts                # 検索機能（タグ検索対応）
└── App.tsx                      # TagsProviderの設定
```

### データ構造

#### Tag型
```typescript
export type Tag = {
  id: string;              // タグの一意ID
  name: string;            // タグ名（最大20文字）
  color: string;          // タグの色（HEX形式）
  createdAt: string;      // 作成日時（ISO形式）
};
```

#### RepoTagsMap型
```typescript
export type RepoTagsMap = {
  [repoId: string]: string[];  // リポジトリID → タグID配列
};
```

### 状態管理

#### TagsContext
- **目的**: アプリ全体でタグ状態を共有
- **提供する機能**:
  - `tags`: 全タグのリスト
  - `repoTags`: リポジトリとタグのマッピング
  - `createTag`: タグ作成
  - `updateTag`: タグ更新
  - `deleteTag`: タグ削除
  - `getTagObjectsForRepo`: リポジトリに紐づくタグオブジェクト取得
  - `setTagsForRepo`: リポジトリにタグを設定

#### データ永続化
- **tagStorage.ts**: localStorageを使用してタグデータを保存
- アカウントごとに分離されたストレージ
- キー形式: `tags-{accountId}`, `repo-tags-{accountId}`

## 主要コンポーネント

### TagManager
**場所**: `src/components/TagManager.tsx`

タグの一括管理を行うモーダルコンポーネント。

**機能**:
- 新規タグの作成（名前、色の設定）
- 既存タグの編集（インライン編集）
- タグの削除（使用中は確認ダイアログ）
- タグの使用状況表示

**使用方法**:
```tsx
<TagManager isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

### TagSelector
**場所**: `src/components/TagSelector.tsx`

リポジトリにタグを付与するモーダルコンポーネント。

**機能**:
- 既存タグの選択/解除
- クイック作成（モーダル内でタグを作成）
- 複数タグの同時設定

**使用方法**:
```tsx
<TagSelector
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  repoId={repo.id}
  repoName={repo.nameWithOwner}
/>
```

### RepoCard（タグ表示部分）
**場所**: `src/components/RepoCard.tsx`

リポジトリカードにタグを表示する機能。

**表示位置**:
- メタデータ部分（言語、スター数、最終更新日の横）
- 最大3個まで表示、それ以上は「+N」形式

**インタラクション**:
- タグをクリックすると`TagSelector`モーダルが開く

## 検索機能の拡張

### 実装内容
**ファイル**: `src/utils/search.ts`

検索機能にタグ検索を追加しました。

**変更点**:
- `matchesSearch`関数にタグ検索ロジックを追加
- `filterRepos`関数に`getRepoTags`パラメータを追加
- `searchAndSortRepos`関数に`getRepoTags`パラメータを追加

**検索対象**:
- リポジトリ名（nameWithOwner）
- 言語（primaryLanguage）
- 説明（description）
- トピック（topics）
- **タグ（tags）** ← 新規追加

**使用方法**:
```typescript
const { getTagObjectsForRepo } = useTagsContext();
const results = searchAndSortRepos(repos, query, sortOrder, getTagObjectsForRepo);
```

## リアルタイム更新の仕組み

### 問題点
以前は各コンポーネントが独立して`useTags`フックを使用していたため、タグの作成・更新が他のコンポーネントに即座に反映されませんでした。

### 解決策
Context APIを使用して状態を共有するように変更しました。

**変更前**:
```typescript
// 各コンポーネントで独立した状態
const { tags } = useTags();  // フックベース
```

**変更後**:
```typescript
// アプリ全体で共有される状態
const { tags } = useTagsContext();  // Contextベース
```

**実装**:
1. `TagsContext`を作成し、タグ状態を管理
2. `App.tsx`で`TagsProvider`でアプリ全体をラップ
3. 各コンポーネントで`useTagsContext`を使用

**効果**:
- タグの作成・更新・削除が即座に全コンポーネントに反映
- リロード不要でUIが更新される
- 状態の一貫性が保証される

## 使用例

### タグの作成
```typescript
const { createTag } = useTagsContext();
const newTag = createTag('フロントエンド', '#3B82F6');
```

### リポジトリにタグを設定
```typescript
const { setTagsForRepo } = useTagsContext();
setTagsForRepo(repoId, [tagId1, tagId2]);
```

### リポジトリのタグを取得
```typescript
const { getTagObjectsForRepo } = useTagsContext();
const tags = getTagObjectsForRepo(repoId);
```

### タグで検索
```typescript
const { getTagObjectsForRepo } = useTagsContext();
const results = searchAndSortRepos(repos, 'フロントエンド', 'lastUpdated', getTagObjectsForRepo);
```

## UI/UXの特徴

### 視覚的な表示
- タグは色付きバッジとして表示
- タグの色に基づいた背景色とボーダー
- 読みやすいテキスト色の自動調整（明るさに応じて白/黒を選択）

### インタラクション
- タグをクリックすると編集モーダルが開く
- ホバー時の視覚的フィードバック
- アニメーション効果（framer-motion使用）

### レスポンシブ対応
- タグが多い場合の折り返し表示
- モバイル対応

## 制限事項

- タグ名は最大20文字
- タグの最大数は150個（警告表示あり）
- アカウントごとにタグが分離される

## 今後の拡張可能性

1. **タグのグループ化**: カテゴリやグループでタグを整理
2. **タグの自動提案**: よく使うタグの自動提案
3. **タグの統計情報**: タグの使用頻度やトレンド表示
4. **タグのインポート/エクスポート**: タグデータのバックアップ・復元
5. **タグのフィルタリング**: タグでリポジトリをフィルタリング

## 関連ファイル

### コアファイル
- `src/contexts/TagsContext.tsx` - 状態管理
- `src/utils/tagStorage.ts` - データ永続化
- `src/types/tag.ts` - 型定義

### UIコンポーネント
- `src/components/TagManager.tsx` - タグ管理モーダル
- `src/components/TagSelector.tsx` - タグ選択モーダル
- `src/components/TagBadge.tsx` - タグバッジ
- `src/components/RepoCard.tsx` - リポジトリカード（タグ表示）

### 機能拡張
- `src/utils/search.ts` - 検索機能（タグ検索対応）
- `src/components/RepoBoard.tsx` - リポジトリボード（検索統合）
- `src/components/TopBar.tsx` - トップバー（検索UI）

## まとめ

タグ機能により、以下のことが可能になりました：

1. ✅ リポジトリにタグを付けて分類
2. ✅ タグでリポジトリを検索
3. ✅ タグの作成・編集・削除
4. ✅ リアルタイムでの状態更新
5. ✅ 視覚的に分かりやすいタグ表示

すべての機能が統合され、シームレスなユーザー体験を提供しています。

