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

**ストレージキー:**
- `github-dashboard-tags:{accountId}` → `Tag[]`
- `github-dashboard-repo-tags:{accountId}` → `RepoTagsMap`

**アカウント切り替え対応:**
- `useAuth()`からcurrentAccountIdを取得
- アカウントごとに独立したタグ空間を管理

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

---

## 10. 参考資料

- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体のガイドライン
- [デザインシステム](../src/lib/designSystem.ts) - UIトークン定義
- [既存ストレージ実装](../src/utils/storage.ts) - ストレージパターン
- [既存プリセット実装](../src/utils/presetStorage.ts) - プリセット管理
- [GitHub Topics API](https://docs.github.com/en/rest/repos/repos#replace-all-repository-topics) - 将来の連携用

---

**ドキュメント終了**
