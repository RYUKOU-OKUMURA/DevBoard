# DevBoard 進捗管理・簡易ロードマップ機能 実装設計書

- 文書種別: 実装設計書
- 対象リポジトリ: `RYUKOU-OKUMURA/DevBoard`
- 関連仕様: `docs/plans/project-progress-roadmap-spec.md`
- ステータス: Draft
- 作成日: 2026-06-23

---

## 目的

今、自分が本当に動かしている少数のリポジトリについて「どの状態で・いつやるか」を、GitHubを開かず・書き込まずに、DevBoardの中だけで把握できるようにする。

この機能が達成したいこと:

- 対象を絞る: 「進捗管理に追加」したリポジトリだけを扱い、100件のノイズを排除して手元の数件に集中する
- 2軸で現状をひと目で: 状態（カンバン）と予定（ロードマップ）で、同じリポジトリが両面に現れる
- GitHubに依存しない・個人完結: localStorage・アカウント単位で、外部遷移もIssue作成もしない
- 初心者が迷わない導線: 1カラムで読む → 必要なものだけ追加 → ボードで管理

明確にやらないこと:

- 日付単位の本格ガント／スケジュール管理（大まかな相対ラベルにとどめる）
- チーム共有・他者公開（個人用）
- GitHub Issue/Projectへの自動同期・作成
- 全リポジトリの網羅的整理の強制

---

## 1. 実装概要

既存のリポジトリメタデータ管理機能を拡張し、以下を追加する。

1. 進捗管理への追加・除外（任意のリポジトリだけ管理対象にする）
2. 開発段階の保存
3. 作業予定枠の保存
4. 管理対象リポジトリだけを表示するカンバンビュー
5. 管理対象リポジトリだけを表示するロードマップビュー
6. 「すべて」「カンバン」「ロードマップ」の表示モード切り替え
7. 表示モードの永続化
8. リポジトリメタデータのバージョン1から2への移行

既存の以下の実装は再利用する。

- `Repo`
- `RepoUserStatus`
- `RepoUserMeta`
- `useRepositoryMeta`
- `repositoryMetaStorage`
- `RepositoryHome`
- `RepositoryCard`
- `RepositoryDetailPanel`
- `classifyRepo`
- `getStorageItem`
- `setStorageItem`
- アカウント単位の保存方式
- 検索と並び替え
- 詳細パネルの自動保存

---

## 2. 設計方針

### 2.1 既存データを作り直さない

既存の`RepoUserMeta`を拡張する。

別の進捗データストアは新設しない。

### 2.2 GitHub活動状況と手動進捗を分離する

以下は変更しない。

```ts
export type RepoAutoHealth =
  | 'Active'
  | 'Stale'
  | 'Dormant'
  | 'Archived';
```

`RepoAutoHealth`はGitHub上の活動状況にだけ使用する。

カンバンの列分類には`RepoUserStatus`を使用する。

### 2.3 新しいガントチャートライブラリを導入しない

ロードマップはCSS Gridで実装する。

以下は使用しない。

- ガントチャートライブラリ
- SVGによる日付バー
- Canvas
- 日付計算ライブラリ
- 新しいドラッグ＆ドロップライブラリ

### 2.4 未入力データを保存しない

全リポジトリに初期値を即時保存すると、100件分の不要なレコードが作られる。

メタデータが存在しないリポジトリは、表示時に仮想的な初期値を適用する。

「進捗管理に追加」した時点、または各項目を実際に編集した時点で保存する。追加前のリポジトリは保存しない。

### 2.5 進捗管理は追加したリポジトリのみ

カンバンとロードマップには、ユーザーが「進捗管理に追加」したリポジトリのみを表示する。

全リポジトリの閲覧は1カラムの「すべて」ビューで行う。「すべて」ビューのカードと詳細パネルから、任意のリポジトリを進捗管理へ追加・除外できる。

追加・除外は`RepoUserMeta`の`tracked`フラグで表現し、別の進捗データストアは新設しない。

追加は1クリックで行い、`tracked`のみを`true`にする。`status`・`scheduleBucket`は既定値（未整理・未定）のままとし、各列の意味が薄れないようにする。

---

## 3. データモデル

### 3.1 追加する型

`src/types/repo.ts`へ以下を追加する。

```ts
export type RepoProjectStage =
  | 'unassigned'
  | 'idea'
  | 'planning'
  | 'implementation'
  | 'testing'
  | 'released'
  | 'maintenance';

export type RepoScheduleBucket =
  | 'this_week'
  | 'next_week'
  | 'this_month'
  | 'next_month'
  | 'later'
  | 'unscheduled';

export type RepositoryViewMode =
  | 'all'
  | 'kanban'
  | 'roadmap';
```

### 3.2 `RepoUserMeta`の変更

変更前:

```ts
export interface RepoUserMeta {
  repoId: string;
  status: RepoUserStatus;
  purpose: string;
  nextAction: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
```

変更後:

```ts
export interface RepoUserMeta {
  repoId: string;
  tracked: boolean;
  status: RepoUserStatus;
  stage: RepoProjectStage;
  scheduleBucket: RepoScheduleBucket;
  purpose: string;
  nextAction: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.3 `ViewMode`との分離

既存の`src/types/index.ts`には以下が存在する。

```ts
export type ViewMode = 'kanban' | 'grid' | 'list';
```

この型は旧ボードや他画面で使われる可能性があるため、今回の表示切り替えには流用しない。

`RepositoryViewMode`を別途定義し、影響範囲を`RepositoryHome`周辺に限定する。

---

## 4. メタデータ初期値

`createDefaultRepositoryMeta`を変更する。

変更後:

```ts
export function createDefaultRepositoryMeta(
  repoId: string,
  now = new Date().toISOString()
): RepoUserMeta {
  return {
    repoId,
    tracked: false,
    status: 'unreviewed',
    stage: 'unassigned',
    scheduleBucket: 'unscheduled',
    purpose: '',
    nextAction: '',
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}
```

---

## 5. 保存形式

### 5.1 保存バージョン

`src/storage/repositoryMetaStorage.ts`を変更する。

```ts
const REPOSITORY_META_VERSION = 2;
```

保存形式:

```ts
type RepositoryMetaEnvelope = {
  version: number;
  records: RepoUserMeta[];
};
```

保存例:

```json
{
  "version": 2,
  "records": [
    {
      "repoId": "R_kgDOExample",
      "tracked": true,
      "status": "in_progress",
      "stage": "implementation",
      "scheduleBucket": "this_week",
      "purpose": "複数リポジトリを整理する",
      "nextAction": "ロードマップ行を実装する",
      "note": "日付単位では管理しない",
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-06-23T00:00:00.000Z"
    }
  ]
}
```

---

## 6. 保存データの正規化

### 6.1 許可値セット

`repositoryMetaStorage.ts`へ追加する。

```ts
const PROJECT_STAGE_VALUES = new Set<RepoProjectStage>([
  'unassigned',
  'idea',
  'planning',
  'implementation',
  'testing',
  'released',
  'maintenance',
]);

const SCHEDULE_BUCKET_VALUES = new Set<RepoScheduleBucket>([
  'this_week',
  'next_week',
  'this_month',
  'next_month',
  'later',
  'unscheduled',
]);
```

### 6.2 型ガード

```ts
function isRepoProjectStage(value: unknown): value is RepoProjectStage {
  return (
    typeof value === 'string' &&
    PROJECT_STAGE_VALUES.has(value as RepoProjectStage)
  );
}

function isRepoScheduleBucket(value: unknown): value is RepoScheduleBucket {
  return (
    typeof value === 'string' &&
    SCHEDULE_BUCKET_VALUES.has(value as RepoScheduleBucket)
  );
}
```

### 6.3 正規化処理

`normalizeRepositoryMeta`を変更する。

```ts
function normalizeRepositoryMeta(value: unknown): RepoUserMeta | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const repoId = readString(record.repoId).trim();

  if (!repoId) {
    return null;
  }

  const now = new Date().toISOString();
  const createdAt = readIsoString(record.createdAt, now);

  return {
    repoId,
    tracked:
      typeof record.tracked === 'boolean'
        ? record.tracked
        : true,
    status: isRepoUserStatus(record.status)
      ? record.status
      : 'unreviewed',
    stage: isRepoProjectStage(record.stage)
      ? record.stage
      : 'unassigned',
    scheduleBucket: isRepoScheduleBucket(record.scheduleBucket)
      ? record.scheduleBucket
      : 'unscheduled',
    purpose: readString(record.purpose),
    nextAction: readString(record.nextAction),
    note: readString(record.note),
    createdAt,
    updatedAt: readIsoString(record.updatedAt, createdAt),
  };
}
```

この処理により、バージョン1のレコードも自動的に読み込める。

バージョン1には`stage`、`scheduleBucket`、`tracked`が存在しないため、以下が適用される。

```ts
stage: 'unassigned'
scheduleBucket: 'unscheduled'
tracked: true
```

`tracked`の欠損時既定値を`true`にするのは、既にメタデータを保存していた＝関心があったリポジトリを、アップグレード直後に進捗管理から見えなくしないためである。未設定のリポジトリは保存レコードを持たないため、仮想メタデータ（§9）の`tracked: false`が適用される。

---

## 7. メタデータ更新フック

`src/hooks/useRepositoryMeta.ts`の更新可能フィールドを拡張する。

変更前:

```ts
type RepositoryMetaPatch = Partial<
  Pick<
    RepoUserMeta,
    'status' | 'purpose' | 'nextAction' | 'note'
  >
>;
```

変更後:

```ts
export type RepositoryMetaPatch = Partial<
  Pick<
    RepoUserMeta,
    | 'status'
    | 'tracked'
    | 'stage'
    | 'scheduleBucket'
    | 'purpose'
    | 'nextAction'
    | 'note'
  >
>;
```

`updateMeta`のレコード生成処理も変更する。

```ts
const next: RepoUserMeta = {
  repoId,
  tracked: patch.tracked ?? current.tracked,
  status: patch.status ?? current.status,
  stage: patch.stage ?? current.stage,
  scheduleBucket:
    patch.scheduleBucket ?? current.scheduleBucket,
  purpose: patch.purpose ?? current.purpose,
  nextAction: patch.nextAction ?? current.nextAction,
  note: patch.note ?? current.note,
  createdAt: current.createdAt,
  updatedAt: now,
};
```

`upsertRepositoryMeta`にも同じ変更を適用する。

---

## 8. 表示ラベル

`src/components/repositories/repositoryMetaLabels.ts`を拡張する。

```ts
import type {
  RepoProjectStage,
  RepoScheduleBucket,
  RepoUserStatus,
} from '../../types';

export const REPOSITORY_USER_STATUS_OPTIONS = [
  { value: 'unreviewed', label: '未整理' },
  { value: 'learning', label: '確認中' },
  { value: 'in_progress', label: '進行中' },
  { value: 'paused', label: '保留' },
  { value: 'done', label: '完了' },
] satisfies Array<{
  value: RepoUserStatus;
  label: string;
}>;

export const REPOSITORY_PROJECT_STAGE_OPTIONS = [
  { value: 'unassigned', label: '未設定' },
  { value: 'idea', label: 'アイデア' },
  { value: 'planning', label: '設計' },
  { value: 'implementation', label: '実装' },
  { value: 'testing', label: 'テスト' },
  { value: 'released', label: '公開済み' },
  { value: 'maintenance', label: '保守' },
] satisfies Array<{
  value: RepoProjectStage;
  label: string;
}>;

export const REPOSITORY_SCHEDULE_BUCKET_OPTIONS = [
  { value: 'this_week', label: '今週' },
  { value: 'next_week', label: '来週' },
  { value: 'this_month', label: '今月中' },
  { value: 'next_month', label: '来月' },
  { value: 'later', label: 'それ以降' },
  { value: 'unscheduled', label: '未定' },
] satisfies Array<{
  value: RepoScheduleBucket;
  label: string;
}>;

export function getRepositoryUserStatusLabel(
  status: RepoUserStatus
): string {
  return (
    REPOSITORY_USER_STATUS_OPTIONS.find(
      (option) => option.value === status
    )?.label ?? '未整理'
  );
}

export function getRepositoryProjectStageLabel(
  stage: RepoProjectStage
): string {
  return (
    REPOSITORY_PROJECT_STAGE_OPTIONS.find(
      (option) => option.value === stage
    )?.label ?? '未設定'
  );
}

export function getRepositoryScheduleBucketLabel(
  bucket: RepoScheduleBucket
): string {
  return (
    REPOSITORY_SCHEDULE_BUCKET_OPTIONS.find(
      (option) => option.value === bucket
    )?.label ?? '未定'
  );
}
```

---

## 9. 仮想メタデータ

メタデータ未保存のリポジトリを表示するため、以下の関数を追加する。

新規ファイル:

```text
src/components/repositories/repositoryProgressModel.ts
```

実装:

```ts
import type {
  Repo,
  RepoScheduleBucket,
  RepoUserMeta,
  RepoUserStatus,
} from '../../types';

export function resolveRepositoryMeta(
  repoId: string,
  meta: RepoUserMeta | null | undefined
): RepoUserMeta {
  if (meta) {
    return meta;
  }

  const now = new Date(0).toISOString();

  return {
    repoId,
    tracked: false,
    status: 'unreviewed',
    stage: 'unassigned',
    scheduleBucket: 'unscheduled',
    purpose: '',
    nextAction: '',
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}
```

表示用の仮想メタデータはlocalStorageへ保存しない。

仮想メタデータの`tracked`は`false`である。未設定リポジトリは進捗管理（カンバン・ロードマップ）に表示されず、「すべて」ビューの表示専用となる。

---

## 10. グループ化モデル

同じ`repositoryProgressModel.ts`に、表示用のグループ化処理を追加する。

カンバン・ロードマップのグループ化は、`tracked`が`true`のリポジトリのみを扱う。未設定・除外済みのリポジトリは仮想メタデータの`tracked: false`により自動的に除外される。

### 10.1 カンバン列順

```ts
export const KANBAN_STATUS_ORDER: RepoUserStatus[] = [
  'in_progress',
  'paused',
  'learning',
  'unreviewed',
  'done',
];
```

### 10.2 ロードマップ列順

```ts
export const ROADMAP_BUCKET_ORDER: RepoScheduleBucket[] = [
  'this_week',
  'next_week',
  'this_month',
  'next_month',
  'later',
  'unscheduled',
];
```

### 10.3 カンバンのグループ化

```ts
export type RepositoryProgressItem = {
  repo: Repo;
  meta: RepoUserMeta;
};

export function groupRepositoriesByStatus(
  repos: Repo[],
  getMeta: (repoId: string) => RepoUserMeta | null
): Record<RepoUserStatus, RepositoryProgressItem[]> {
  const groups: Record<
    RepoUserStatus,
    RepositoryProgressItem[]
  > = {
    unreviewed: [],
    learning: [],
    in_progress: [],
    paused: [],
    done: [],
  };

  repos.forEach((repo) => {
    const meta = resolveRepositoryMeta(
      repo.id,
      getMeta(repo.id)
    );

    if (!meta.tracked) {
      return;
    }

    groups[meta.status].push({
      repo,
      meta,
    });
  });

  return groups;
}
```

### 10.4 ロードマップ行の生成

ロードマップは列ごとの配列ではなく、1リポジトリ1行で表示する。

```ts
export function createRoadmapItems(
  repos: Repo[],
  getMeta: (repoId: string) => RepoUserMeta | null
): RepositoryProgressItem[] {
  return repos
    .map((repo) => ({
      repo,
      meta: resolveRepositoryMeta(
        repo.id,
        getMeta(repo.id)
      ),
    }))
    .filter((item) => item.meta.tracked);
}
```

---

## 11. 表示モード保存フック

新規ファイル:

```text
src/hooks/useRepositoryView.ts
```

実装方針:

```ts
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import type {
  RepositoryViewMode,
} from '../types';
import {
  getStorageItem,
  setStorageItem,
} from '../utils/storage';

// 既存の保存値との互換のため、prefixは変更しない。
const STORAGE_PREFIX =
  'repository-progress-view:';

function isRepositoryViewMode(
  value: unknown
): value is RepositoryViewMode {
  return (
    value === 'all' ||
    value === 'kanban' ||
    value === 'roadmap'
  );
}

export function getRepositoryViewKey(
  accountId: string
): string {
  return `${STORAGE_PREFIX}${accountId}`;
}

export function useRepositoryView(
  accountId: string
) {
  const [viewMode, setViewModeState] =
    useState<RepositoryViewMode>(() => {
      const stored = getStorageItem<unknown>(
        getRepositoryViewKey(accountId),
        'all'
      );

      return isRepositoryViewMode(stored)
        ? stored
        : 'all';
    });

  useEffect(() => {
    const stored = getStorageItem<unknown>(
      getRepositoryViewKey(accountId),
      'all'
    );

    setViewModeState(
      isRepositoryViewMode(stored)
        ? stored
        : 'all'
    );
  }, [accountId]);

  const setViewMode = useCallback(
    (next: RepositoryViewMode) => {
      setViewModeState(next);
      setStorageItem(
        getRepositoryViewKey(accountId),
        next
      );
    },
    [accountId]
  );

  return {
    viewMode,
    setViewMode,
  };
}
```

---

## 12. 表示モード切り替えコンポーネント

新規ファイル:

```text
src/components/repositories/RepositoryViewSwitcher.tsx
```

Props:

```ts
interface RepositoryViewSwitcherProps {
  value: RepositoryViewMode;
  onChange: (
    value: RepositoryViewMode
  ) => void;
}
```

表示:

```text
[ すべて ] [ カンバン ] [ ロードマップ ]
```

実装要件:

- `button`を使用する
- 選択中のボタンへ`aria-pressed="true"`を設定する
- 既存の`focusRing`を利用する
- 色だけで選択状態を表現しない
- 選択中には背景、枠線、文字ウェイトを変更する

---

## 13. 進捗カード

カンバンで既存の`RepositoryCard`をそのまま使用すると、横幅が狭い列でカードが大きくなりすぎる。

進捗表示用のコンパクトカードを追加する。

新規ファイル:

```text
src/components/repositories/RepositoryProgressCard.tsx
```

Props:

```ts
interface RepositoryProgressCardProps {
  repo: Repo;
  meta: RepoUserMeta;
  autoHealth: ColumnKey;
  onOpenDetail: (repo: Repo) => void;
}
```

表示内容:

- リポジトリ名
- owner
- 開発段階
- 作業予定
- 次にやること
- GitHub活動状況
- 最終更新日
- Archivedバッジ

表示例:

```text
DevBoard / RYUKOU-OKUMURA

[実装] [今週]

次:
ロードマップ行を実装する

Active · 最終更新 2日前
```

`nextAction`が空の場合:

```text
次にやること未設定
```

カード全体をボタン化するか、既存`RepositoryCard`と同様に全面クリック用のボタンを重ねる。

カード内に「進捗管理から外す」操作（小さなボタンまたはメニュー）を置いてもよい。外す場合は`tracked`を`false`にし、メタデータ自体は保持する。MVPでは詳細パネル（§17）または「すべて」ビュー（§18）からの操作を主とし、カード内配置は任意とする。

---

## 14. カンバンコンポーネント

新規ファイル:

```text
src/components/repositories/RepositoryProgressKanban.tsx
```

Props:

```ts
interface RepositoryProgressKanbanProps {
  repos: Repo[];
  getMeta: (
    repoId: string
  ) => RepoUserMeta | null;
  getAutoHealth: (
    repo: Repo
  ) => ColumnKey;
  onOpenDetail: (
    repo: Repo
  ) => void;
  isLoading?: boolean;
}
```

実装構造:

```tsx
<div className="overflow-x-auto">
  <div
    className="
      grid
      min-w-max
      grid-flow-col
      auto-cols-[minmax(280px,1fr)]
      gap-stack-md
    "
  >
    {KANBAN_STATUS_ORDER.map((status) => (
      <RepositoryProgressKanbanColumn
        key={status}
        status={status}
        items={groups[status]}
      />
    ))}
  </div>
</div>
```

新規ファイル:

```text
src/components/repositories/RepositoryProgressKanbanColumn.tsx
```

列には以下を表示する。

- 状態名
- 件数
- 進捗カード一覧
- 空の場合のメッセージ

空表示例:

```text
この状態のプロジェクトはありません
```

MVPではドロップ領域を実装しない。

---

## 15. ロードマップコンポーネント

新規ファイル:

```text
src/components/repositories/RepositoryProgressRoadmap.tsx
```

Props:

```ts
interface RepositoryProgressRoadmapProps {
  repos: Repo[];
  getMeta: (
    repoId: string
  ) => RepoUserMeta | null;
  getAutoHealth: (
    repo: Repo
  ) => ColumnKey;
  onOpenDetail: (
    repo: Repo
  ) => void;
  isLoading?: boolean;
}
```

### 15.1 グリッド定義

ロードマップ全体はCSS Gridで実装する。

```css
grid-template-columns:
  minmax(220px, 320px)
  repeat(6, minmax(160px, 1fr));
```

列構成:

1. プロジェクト
2. 今週
3. 来週
4. 今月中
5. 来月
6. それ以降
7. 未定

### 15.2 ヘッダー

ヘッダーは可能であれば上部へsticky表示する。

左端のプロジェクト列も可能であればsticky表示する。

### 15.3 行コンポーネント

新規ファイル:

```text
src/components/repositories/RepositoryProgressRoadmapRow.tsx
```

Props:

```ts
interface RepositoryProgressRoadmapRowProps {
  item: RepositoryProgressItem;
  autoHealth: ColumnKey;
  onOpenDetail: (
    repo: Repo
  ) => void;
}
```

行の左端には以下を表示する。

- リポジトリ名
- プロジェクト状態
- GitHub活動状況
- 最終更新日

予定枠のうち、`meta.scheduleBucket`と一致するセルだけにロードマップバーを表示する。

概念コード:

```tsx
<div className="contents">
  <RepositoryIdentityCell
    repo={item.repo}
    meta={item.meta}
    autoHealth={autoHealth}
  />

  {ROADMAP_BUCKET_ORDER.map((bucket) => (
    <div
      key={bucket}
      className="border-l border-[var(--border-subtle)] p-inset-sm"
    >
      {item.meta.scheduleBucket === bucket && (
        <RepositoryRoadmapBar
          repo={item.repo}
          meta={item.meta}
          onOpenDetail={onOpenDetail}
        />
      )}
    </div>
  ))}
</div>
```

### 15.4 ロードマップバー

バーには以下を表示する。

- 開発段階
- 次にやること
- プロジェクト状態

表示例:

```text
実装
ロードマップ画面を追加
```

`nextAction`が空の場合:

```text
実装
次にやること未設定
```

バーをクリックすると詳細パネルを開く。

---

## 16. `RepositoryHome`への統合

対象ファイル:

```text
src/components/repositories/RepositoryHome.tsx
```

### 16.1 フックの追加

```ts
const {
  viewMode,
  setViewMode,
} = useRepositoryView(accountId);
```

### 16.2 ヘッダーへの追加

検索・並び替え付近に`RepositoryViewSwitcher`を追加する。

推奨配置:

```text
検索
並び替え
表示切り替え
```

狭い画面では縦並びまたは折り返し表示する。

### 16.3 表示分岐

`viewMode`で3種類を切り替える。

```tsx
{viewMode === 'all' ? (
  <RepositoryList
    repos={visibleRepos}
    getMeta={getMeta}
    getAutoHealth={getAutoHealth}
    onOpenDetail={setSelectedRepo}
    onToggleTracked={handleToggleTracked}
    isLoading={isLoading}
  />
) : viewMode === 'kanban' ? (
  <RepositoryProgressKanban
    repos={visibleRepos}
    getMeta={getMeta}
    getAutoHealth={getAutoHealth}
    onOpenDetail={setSelectedRepo}
    isLoading={isLoading}
  />
) : (
  <RepositoryProgressRoadmap
    repos={visibleRepos}
    getMeta={getMeta}
    getAutoHealth={getAutoHealth}
    onOpenDetail={setSelectedRepo}
    isLoading={isLoading}
  />
)}
```

`visibleRepos`は検索・並び替え後の全リポジトリ。カンバン・ロードマップは内部で`tracked`のみを表示する（§10）。「すべて」ビューは全リポジトリを表示し、カードごとに「進捗管理に追加 / 進捗管理から外す」を操作できる。

`handleToggleTracked`は`RepoUserMeta`の`tracked`を反転させる。メタデータ未保存のリポジトリでは、追加時に`tracked: true`の初期レコードを作成する。

```tsx
const handleToggleTracked = useCallback(
  (repoId: string) => {
    const current = resolveRepositoryMeta(
      repoId,
      getMeta(repoId)
    );
    updateMeta(repoId, {
      tracked: !current.tracked,
    });
  },
  [getMeta, updateMeta]
);
```

既存の詳細パネルはそのまま維持する。

```tsx
{selectedRepo && (
  <RepositoryDetailPanel
    repo={selectedRepo}
    autoHealth={getAutoHealth(selectedRepo)}
    userMeta={getMeta(selectedRepo.id)}
    onUserMetaChange={updateMeta}
    onClose={handleCloseDetail}
    ...
  />
)}
```

### 16.4 既存の一覧について

今回の仕様では、`RepositoryList`を「すべて」ビューとして維持し、メイン表示は以下の3モードとする。

- すべて（全リポジトリの1カラム一覧。進捗管理への追加・除外を行う）
- カンバン（`tracked`のみ）
- ロードマップ（`tracked`のみ）

`RepositoryList`は削除せず、デフォルトの表示モードを「すべて」とする。これにより、初心者はまずリポジトリを読み、必要なものだけを進捗管理へ追加してカンバン・ロードマップで管理する導線になる。

旧カンバンと保存ビューを提供する高度な機能は変更しない。

---

## 17. 詳細パネルの変更

対象ファイル:

```text
src/components/repositories/RepositoryDetailPanel.tsx
```

### 17.1 Props変更

変更前:

```ts
onUserMetaChange: (
  repoId: string,
  patch: Partial<
    Pick<
      RepoUserMeta,
      'status' |
      'purpose' |
      'nextAction' |
      'note'
    >
  >
) => void;
```

変更後:

```ts
onUserMetaChange: (
  repoId: string,
  patch: Partial<
    Pick<
      RepoUserMeta,
      | 'status'
      | 'stage'
      | 'scheduleBucket'
      | 'purpose'
      | 'nextAction'
      | 'note'
    >
  >
) => void;
```

### 17.2 値の取得

```ts
const tracked =
  userMeta?.tracked ?? false;

const status =
  userMeta?.status ?? 'unreviewed';

const stage =
  userMeta?.stage ?? 'unassigned';

const scheduleBucket =
  userMeta?.scheduleBucket ?? 'unscheduled';

const purpose =
  userMeta?.purpose ?? '';

const nextAction =
  userMeta?.nextAction ?? '';

const note =
  userMeta?.note ?? '';
```

### 17.3 開発段階選択

```tsx
<label className="grid gap-stack-xs">
  <span className="text-caption font-semibold text-[var(--text-muted)]">
    開発段階
  </span>

  <select
    value={stage}
    name="repository-project-stage"
    onChange={(event) =>
      onUserMetaChange(repo.id, {
        stage:
          event.target.value as RepoProjectStage,
      })
    }
  >
    {REPOSITORY_PROJECT_STAGE_OPTIONS.map(
      (option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      )
    )}
  </select>
</label>
```

### 17.4 作業予定選択

```tsx
<label className="grid gap-stack-xs">
  <span className="text-caption font-semibold text-[var(--text-muted)]">
    作業予定
  </span>

  <select
    value={scheduleBucket}
    name="repository-schedule-bucket"
    onChange={(event) =>
      onUserMetaChange(repo.id, {
        scheduleBucket:
          event.target.value as RepoScheduleBucket,
      })
    }
  >
    {REPOSITORY_SCHEDULE_BUCKET_OPTIONS.map(
      (option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      )
    )}
  </select>
</label>
```

### 17.5 入力制限

以下を追加する。

```tsx
<input
  name="repository-purpose"
  maxLength={200}
  ...
/>

<input
  name="repository-next-action"
  maxLength={200}
  ...
/>

<textarea
  name="repository-note"
  maxLength={2000}
  ...
/>
```

### 17.6 進捗管理への追加・除外

詳細パネルに「進捗管理に追加 / 進捗管理から外す」のトグルボタンを置く。

```tsx
<button
  type="button"
  onClick={() =>
    onUserMetaChange(repo.id, {
      tracked: !tracked,
    })
  }
>
  {tracked
    ? '進捗管理から外す'
    : '進捗管理に追加'}
</button>
```

`tracked`が`false`のときは「進捗管理に追加」と表示する。外す場合は`tracked`を`false`にし、`purpose`・`nextAction`・`note`などのメタデータは保持する（再追加で復元できる）。

---

## 18. 既存カードの変更

対象ファイル:

```text
src/components/repositories/RepositoryCard.tsx
```

`RepositoryCard`は「すべて」ビュー（`RepositoryList`）で使用されるため、進捗管理への追加・除外を必須とする。

追加 Props:

```ts
interface RepositoryCardProps {
  // 既存の props に加えて
  tracked: boolean;
  onToggleTracked: (repoId: string) => void;
}
```

表示:

- `tracked`の状態に応じて「進捗管理に追加」または「進捗管理から外す」ボタンを表示する
- 追加済みのリポジトリは、状態バッジなどで進捗管理対象であることが分かるようにする
- 開発段階・作業予定は、設定されている場合だけ控えめに表示してもよい

`RepositoryList`も、`getMeta`・`onToggleTracked`を受け取れるようにPropsを拡張する。

共通化を優先しすぎて実装を複雑にしない。

---

## 19. ファイル変更一覧

### 19.1 変更するファイル

```text
src/types/repo.ts
src/hooks/useRepositoryMeta.ts
src/storage/repositoryMetaStorage.ts
src/components/repositories/repositoryMetaLabels.ts
src/components/repositories/RepositoryHome.tsx
src/components/repositories/RepositoryDetailPanel.tsx
src/components/repositories/RepositoryCard.tsx
src/storage/__tests__/repositoryMetaStorage.test.ts
```

### 19.2 新規作成するファイル

```text
src/hooks/useRepositoryView.ts

src/components/repositories/repositoryProgressModel.ts
src/components/repositories/RepositoryViewSwitcher.tsx
src/components/repositories/RepositoryProgressCard.tsx
src/components/repositories/RepositoryProgressKanban.tsx
src/components/repositories/RepositoryProgressKanbanColumn.tsx
src/components/repositories/RepositoryProgressRoadmap.tsx
src/components/repositories/RepositoryProgressRoadmapRow.tsx
```

### 19.3 新規テスト候補

```text
src/hooks/__tests__/useRepositoryView.test.tsx

src/components/repositories/__tests__/repositoryProgressModel.test.ts
src/components/repositories/__tests__/RepositoryViewSwitcher.test.tsx
src/components/repositories/__tests__/RepositoryProgressKanban.test.tsx
src/components/repositories/__tests__/RepositoryProgressRoadmap.test.tsx
```

---

## 20. ストレージテスト

既存の`repositoryMetaStorage.test.ts`を更新する。

### 20.1 テスト用データ

```ts
function createMeta(
  repoId = 'repo-1'
): RepoUserMeta {
  return {
    repoId,
    tracked: true,
    status: 'in_progress',
    stage: 'implementation',
    scheduleBucket: 'this_week',
    purpose: 'READMEを整える',
    nextAction: '使い方を追記する',
    note: 'スクリーンショットを足す',
    createdAt:
      '2026-01-01T00:00:00.000Z',
    updatedAt:
      '2026-01-01T00:00:00.000Z',
  };
}
```

### 20.2 必須テスト

#### バージョン2で保存される

```ts
expect(parsed?.version).toBe(2);
```

#### バージョン1から移行できる

```ts
it('migrates version 1 records with default progress fields', () => {
  localStorage.setItem(
    getRepositoryMetaKey(ACCOUNT_A),
    JSON.stringify({
      version: 1,
      records: [
        {
          repoId: 'repo-1',
          status: 'paused',
          purpose: '既存目的',
          nextAction: '既存の次作業',
          note: '既存メモ',
          createdAt:
            '2026-01-01T00:00:00.000Z',
          updatedAt:
            '2026-01-02T00:00:00.000Z',
        },
      ],
    })
  );

  const [meta] =
    getRepositoryMetas(ACCOUNT_A);

  expect(meta?.status).toBe('paused');
  expect(meta?.purpose).toBe('既存目的');
  expect(meta?.nextAction)
    .toBe('既存の次作業');
  expect(meta?.note).toBe('既存メモ');
  expect(meta?.stage)
    .toBe('unassigned');
  expect(meta?.scheduleBucket)
    .toBe('unscheduled');
  expect(meta?.tracked).toBe(true);
});
```

#### 不正な段階を初期値へ戻す

```ts
expect(meta.stage).toBe('unassigned');
```

#### 不正な予定枠を初期値へ戻す

```ts
expect(meta.scheduleBucket)
  .toBe('unscheduled');
```

#### upsertで既存項目を保持する

```ts
const updated = upsertRepositoryMeta(
  ACCOUNT_A,
  'repo-1',
  {
    scheduleBucket: 'next_week',
  }
);

expect(updated.status)
  .toBe('in_progress');

expect(updated.stage)
  .toBe('implementation');

expect(updated.scheduleBucket)
  .toBe('next_week');
```

#### trackedを切り替えて保存できる

```ts
const toggled = upsertRepositoryMeta(
  ACCOUNT_A,
  'repo-1',
  { tracked: false }
);

expect(toggled.tracked).toBe(false);
expect(toggled.status).toBe('in_progress');
```

---

## 21. モデルテスト

`repositoryProgressModel.test.ts`で以下を確認する。

### 21.1 未設定リポジトリ

- `status`が`unreviewed`
- `stage`が`unassigned`
- `scheduleBucket`が`unscheduled`
- `tracked`が`false`
- localStorageへは保存されない

### 21.2 カンバン分類

- `tracked`が`true`の`in_progress`が進行中列へ入る
- `tracked`が`true`の`paused`が保留列へ入る
- `tracked`が`false`のリポジトリはどの列にも入らない
- 追加済みリポジトリが重複しない
- 追加済みリポジトリがいずれか1列へ入る

### 21.3 ロードマップ配置

- `tracked`が`true`の`this_week`が今週セルへ表示される
- `tracked`が`true`の`next_month`が来月セルへ表示される
- `tracked`が`true`で`unscheduled`が未定セルへ表示される
- `tracked`が`false`のリポジトリは行として表示されない
- 1リポジトリにつきバーが1つだけ表示される

---

## 22. コンポーネントテスト

### 22.1 表示切り替え

- 初期値が「すべて」
- カンバン・ロードマップボタンで表示が切り替わる
- 選択状態がアクセシビリティ属性へ反映される

### 22.2 カンバン

- `tracked`が`true`のリポジトリのみ表示される
- 5列が正しい順番で表示される
- 各列に件数が表示される
- カードクリックで詳細パネル用コールバックが呼ばれる
- 空列に空状態が表示される

### 22.3 ロードマップ

- 予定枠のヘッダーが表示される
- `tracked`が`true`のリポジトリ名のみ表示される
- 適切な予定枠にバーが表示される
- `tracked`で`unscheduled`のリポジトリが未定に表示される
- バークリックで詳細パネル用コールバックが呼ばれる

### 22.4 詳細パネル

- 開発段階を変更できる
- 作業予定を変更できる
- 「進捗管理に追加 / から外す」で`tracked`が切り替わる
- `onUserMetaChange`へ正しいpatchが渡る
- メタデータ未設定でも初期値が表示される

### 22.5 すべてビューの追加・除外

- 「進捗管理に追加」で`tracked`が`true`になる
- 「進捗管理から外す」で`tracked`が`false`になる
- 外したリポジトリはカンバン・ロードマップから消える
- 外してもメタデータは保持され、再追加で復元される

---

## 23. 手動確認

### 23.1 データ移行

1. 現行版で状態、目的、次にやること、メモを入力する
2. localStorageにバージョン1データが存在することを確認する
3. 変更版を起動する
4. 既存入力が保持されていることを確認する
5. 開発段階が「未設定」であることを確認する
6. 作業予定が「未定」であることを確認する
7. 新しい項目を変更する
8. バージョン2で保存されることを確認する

### 23.2 カンバン

1. 複数リポジトリを「進捗管理に追加」し、異なる状態を設定する
2. カンバンへ戻る
3. 正しい列へ表示されることを確認する
4. 検索を行う
5. 各列から検索対象外のリポジトリが消えることを確認する
6. 並び替えを変更する
7. 各列内の順番が変わることを確認する

### 23.3 ロードマップ

1. 複数リポジトリを「進捗管理に追加」し、異なる作業予定を設定する
2. ロードマップへ切り替える
3. 正しい予定枠へ表示されることを確認する
4. 追加済みで予定未設定のリポジトリが未定に表示されることを確認する
5. 横スクロールできることを確認する
6. バーから詳細パネルを開けることを確認する

### 23.4 アカウント切り替え

1. アカウントAでメタデータを入力する
2. ロードマップを選択する
3. アカウントBへ切り替える
4. アカウントAの情報が表示されないことを確認する
5. アカウントBの初期表示がカンバンであることを確認する
6. アカウントAへ戻る
7.入力情報とロードマップ表示が復元されることを確認する

### 23.5 件数確認

1. 100件程度のリポジトリデータを用意する
2. カンバンを表示する
3. 検索、スクロール、カード選択を確認する
4. ロードマップへ切り替える
5. 横スクロール、縦スクロール、カード選択を確認する
6. 明らかな操作停止や長時間のフリーズがないことを確認する

### 23.6 追加・除外

1. 「すべて」ビューで任意のリポジトリを選び「進捗管理に追加」する
2. カンバンへ切り替え、追加したリポジトリが未整理列に現れることを確認する
3. 詳細パネルで状態・開発段階・作業予定を設定する
4. カンバン・ロードマップでそれぞれ正しい列・予定枠に移動することを確認する
5. 「進捗管理から外す」でカンバン・ロードマップから消えることを確認する
6. 再度「進捗管理に追加」し、設定が復元されることを確認する

---

## 24. 実装順序

以下の順番で実装する。

### Step 1: 型定義

- `RepoProjectStage`を追加
- `RepoScheduleBucket`を追加
- `RepositoryViewMode`を追加
- `RepoUserMeta`へ`tracked`を追加

### Step 2: 保存処理

- 保存バージョンを2へ更新
- 許可値セットを追加
- 正規化処理を更新
- 初期値生成処理を更新
- upsert処理を更新
- バージョン1移行テストを追加

### Step 3: フック

- `useRepositoryMeta`のpatch型へ`tracked`を追加
- 更新処理へ新規項目を追加
- `useRepositoryView`を追加

### Step 4: ラベル

- 開発段階ラベルを追加
- 作業予定ラベルを追加
- ラベル取得関数を追加

### Step 5: 詳細パネル

- 開発段階selectを追加
- 作業予定selectを追加
- 入力文字数制限を追加
- 自動保存を確認

### Step 6: 表示モデル

- 仮想メタデータ生成
- カンバン分類
- ロードマップ行生成
- モデルテストを追加

### Step 7: カンバン

- 表示切り替えコンポーネント
- 進捗カード
- カンバン列
- カンバン全体
- 空状態
- ローディング状態

### Step 8: ロードマップ

- ロードマップヘッダー
- ロードマップ行
- ロードマップバー
- 横スクロール
- sticky表示
- 空状態
- ローディング状態

### Step 9: `RepositoryHome`統合

- 表示モードフックを接続
- ヘッダーへ切り替えを追加
- カンバンとロードマップを分岐表示
- 詳細パネルとの接続を確認
- 検索と並び替えを確認

### Step 10: 品質確認

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

---

## 25. 実装上の注意

### 25.1 `updatedAt`の意味

`updatedAt`は、プロジェクトメタデータを最後に変更した時刻とする。

GitHubで最後に作業した時刻ではない。

GitHub上の作業日時には`repo.pushedAt`を使用する。

### 25.2 `Archived`と`done`は別物

以下を混同しない。

```text
repo.isArchived
```

GitHub上でリポジトリがArchivedになっているか。

```text
meta.status === 'done'
```

ユーザーがプロジェクトを完了扱いにしているか。

GitHub上ではArchivedだが、DevBoard上では確認中という状態も許可する。

### 25.3 保存エラー

既存の`saveError`表示を利用する。

新規項目の保存に失敗した場合も、既存と同じエラーを表示する。

```text
自分用メモを保存できませんでした。
ブラウザの保存領域を確認してください。
```

### 25.4 入力ごとの保存

既存仕様に合わせ、select変更時は即時保存する。

テキスト入力は現在の自動保存方式を維持する。

入力中のlocalStorage書き込みが問題になった場合は、別変更としてデバウンスを導入する。

今回のMVPにはデバウンス変更を含めない。

### 25.5 週の自動切り替え

`this_week`や`next_week`は相対的なラベルだが、保存値を日付に自動変換しない。

週が変わっても、保存値は自動更新しない。

これは、ユーザーの意図しない予定変更を防ぐためである。

必要になった場合は将来、以下の機能を検討する。

- 週初めに「先週の予定を移動しますか」と確認する
- 最終予定更新日を保存する
- 手動で予定を繰り越す

MVPでは実装しない。

### 25.7 `tracked`とメタデータの関係

`tracked`は「進捗管理（カンバン・ロードマップ）に含めるか」の表示制御フラグである。

`tracked`を`false`にしても、`purpose`・`nextAction`・`note`・`status`などのメタデータは削除しない。再追加で復元できる。

削除を確定させたい場合は、別途メタデータ削除の操作を将来検討する。MVPでは「外す＝非表示」のみとする。

---

## 26. リスクと対策

### リスク1: 未整理列へ大量のリポジトリが入る

100件近い既存リポジトリが、初回はすべて未整理になる可能性がある。

カンバン・ロードマップは「進捗管理に追加」したリポジトリのみを表示するため、既存リポジトリが一括で未整理列に流入することはない。未整理列には「追加したが状態未設定」のリポジトリだけが入る。

対策:

- 未整理を正常な初期状態として扱う
- 入力を強制しない
- 検索を利用できるようにする
- 将来、未整理列の折りたたみを検討する

### リスク2: ロードマップの未定列が大きくなる

予定未入力のリポジトリがすべて未定へ表示される。

ロードマップも「進捗管理に追加」したリポジトリのみを表示するため、予定未入力のリポジトリが一括で未定へ流入することはない。未定列には「追加したが予定未設定」のリポジトリだけが入る。

対策:

- 未定を右端に配置する
- 検索と並び替えを適用する
- 将来、未定のみ折りたたむ機能を検討する

### リスク3: カンバンと既存自動分類が混同される

対策:

画面上の名称を明確に分ける。

```text
自分の状態: 進行中
GitHub活動: Active
```

`Active`をカンバン列名として使用しない。

### リスク4: ロードマップが本格ガントとして期待される

対策:

画面名称を「ロードマップ」とする。

説明文を表示する。

```text
日付単位ではなく、大まかな作業予定を表示しています。
```

### リスク5: 保存形式変更で既存データが失われる

対策:

- 正規化処理で欠損項目へ初期値を適用する
- 既存フィールドを保持するテストを追加する
- 破損データ以外は削除しない
- 書き込みは常にバージョン2形式で行う

### リスク6: 追加方法が分からずボードが空のままになる

初心者が「進捗管理に追加」に気づかないと、カンバン・ロードマップが空のままになる。

対策:

- ボードの空状態で「リポジトリ一覧（すべて）から『進捗管理に追加』を選んでください」と案内し、「すべて」ビューへ遷移させる
- 「すべて」ビューのカードに追加ボタンを目立たせる
- デフォルトの表示モードを「すべて」とし、まずリポジトリを読む導線にする

---

## 27. プルリクエスト分割案

変更量が大きくなりすぎる場合は、以下に分割する。

### PR 1: データモデルと保存移行

- 型追加（`RepoProjectStage`, `RepoScheduleBucket`, `RepositoryViewMode`, `tracked`）
- ストレージバージョン2
- 移行処理（`tracked`欠損時は`true`）
- テスト

### PR 2: 詳細パネルへの入力追加

- 開発段階
- 作業予定
- 進捗管理への追加・除外（`tracked`トグル）
- ラベル
- 自動保存
- コンポーネントテスト

### PR 3: 「すべて」ビューとカンバン

- 3-way表示切り替え（すべて・カンバン・ロードマップの型と切替コンポーネント）
- 「すべて」ビューでの追加・除外（`RepositoryCard`, `RepositoryList`）
- 進捗カード
- 状態別カンバン（`tracked`のみ）
- `RepositoryHome`統合

### PR 4: ロードマップビュー

- ロードマップグリッド
- 行とバー
- レスポンシブ対応
- テスト

この分割により、各段階で既存機能の動作を確認できる。

---

## 28. 完了チェックリスト

### データ

- [x] `RepoProjectStage`を追加した
- [x] `RepoScheduleBucket`を追加した
- [x] `RepoUserMeta`に`tracked`を追加した
- [x] 保存バージョンを2へ更新した
- [x] バージョン1から移行できる（`tracked`欠損時は`true`）
- [x] 既存入力が保持される
- [x] アカウント別保存が維持される

### 詳細パネル

- [x] 開発段階を選択できる
- [x] 作業予定を選択できる
- [x] 「進捗管理に追加 / から外す」で`tracked`を切り替えられる
- [x] 自動保存される
- [x] 未入力時に初期値を表示できる
- [x] 保存エラーを表示できる

### カンバン

- [x] 5つの状態列が表示される
- [x] 正しい列へ分類される
- [x] 追加した(`tracked`)リポジトリのみ表示される
- [x] カードから詳細を開ける
- [x] 横スクロールできる

### ロードマップ

- [x] 6つの予定枠が表示される
- [x] 1リポジトリ1行で表示される
- [x] 正しい予定枠にバーが表示される
- [x] 追加した(`tracked`)リポジトリのみ表示される
- [x] バーから詳細を開ける
- [x] 横スクロールできる

### 共通

- [x] 表示モードを切り替えられる（すべて・カンバン・ロードマップ）
- [x] 表示モードが保存される
- [x] 「進捗管理に追加 / から外す」で`tracked`が切り替わる
- [x] カンバン・ロードマップに`tracked`のみ表示される
- [x] 外したリポジトリのメタデータが保持され、再追加で復元される
- [x] 検索が両方へ反映される
- [x] 並び替えが両方へ反映される
- [x] GitHub活動状況が維持される
- [x] Public / Private表示が維持される
- [x] Archived表示が維持される
- [ ] キーボード操作を確認した（コード上はfocusRing・Esc等を実装済み。手動確認は残課題）
- [ ] スマートフォン幅を確認した（レスポンシブクラスを実装済み。手動確認は残課題）
- [ ] 100件程度で動作確認した（手動確認は残課題）

### CI

- [x] `npm run lint`が成功する
- [x] `npm run typecheck`が成功する
- [x] `npm test -- --run`が成功する
- [x] `npm run build`が成功する