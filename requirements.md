# GitHub Dashboard MVP 要件定義書

## 1. プロジェクト概要
- **目的**: GitHub 上のリポジトリをボード形式で視覚整理し、状況把握とリポジトリ遷移をスムーズにする。
- **成果物**: 列ごとに分類されたリポジトリカードを表示し、クリックで GitHub リポジトリページへ遷移できる単一画面のダッシュボード。
- **対象ユーザー**: GitHub 組織や個人のリポジトリ管理者。

## 2. MVP スコープ
- リポジトリの取得・分類・表示・リンク遷移に限定。
- 並び替え・検索と最大 5 件の保存ビューのみ提供。
- ドラッグ＆ドロップや一括操作などの編集機能は次期以降。

## 3. 画面要件
- **画面構成**: 単一画面。トップバー + 4 列のボードレイアウト。
- **トップバー**:
  - テキスト検索ボックス（name / topic / description / primaryLanguage を対象）。
  - 保存ビュー選択（最大 5 件まで保存）。検索キーワードと並び替え条件を保存・復元。
  - 並び替えセレクター（`最終更新` / `名前`）。
- **ボード列**:
  - 列キー: `Active` / `Stale` / `Dormant` / `Archived`。
  - 各列ヘッダに列名と該当リポジトリ数を表示。

## 4. カード表示要件
- **タイトル**: `owner/name` を表示。クリックで `htmlUrl` を新規タブ（Web）または既定ブラウザ（デスクトップ）で開く。
- **サブ情報**:
  - 最終更新日時の相対表示（例: `3d ago`）。
  - 主要言語（ある場合のみ）。
  - Topics（最大 3 つ）。
- **バッジ**: `private` または `public` のステータス表示。
- **デフォルト表示順**: 最終更新が新しい順。
- **空表示**: 列内に該当リポジトリが無い場合は `"No repositories"` を表示。

## 5. 検索・フィルタリング要件
- テキスト検索ボックスの入力値で以下の値を小文字化して部分一致フィルタ:
  - `nameWithOwner`
  - `primaryLanguage`
  - `description`
  - `topics`（配列を連結）
- 検索ワードが空の場合は全件表示。
- ソート条件:
  - `最終更新`: `pushedAt` の降順。
  - `名前`: `nameWithOwner` の昇順（ロケール比較）。

## 6. 分類ロジック
```text
if isArchived → Archived
else if daysSince(pushedAt) ≤ 60 → Active
else if daysSince(pushedAt) ≤ 180 → Stale
else → Dormant
```
- 判定基準日: UI レンダリング時の現在日時。
- 閾値 `60 / 180` 日は設定で変更可能（デフォルト値は上記）。

## 7. データ要件
- 起動時に GitHub API からリポジトリ一覧を取得し、ローカル（メモリまたは SQLite）にキャッシュ。
- 取得フィールド:
  - `id`
  - `nameWithOwner`
  - `htmlUrl`
  - `pushedAt`
  - `isArchived`
  - `isPrivate`
  - `description`
  - `primaryLanguage`
  - `topics`（最大件数は GitHub API 仕様に準拠）
- TypeScript 型定義:
  ```ts
  export type Repo = {
    id: string;
    nameWithOwner: string;
    htmlUrl: string;
    pushedAt: string;
    isArchived: boolean;
    isPrivate: boolean;
    description?: string;
    primaryLanguage?: string;
    topics: string[];
  };

  export type ColumnKey = "Active" | "Stale" | "Dormant" | "Archived";
  ```

## 8. アーキテクチャ要件
- **推奨構成 (デスクトップ)**: Tauri + React + TypeScript + Octokit。
  - フロントエンドは UI 表示に専念。
  - バックエンド（Rust または Node）で Octokit を呼び出し、データを取得。
  - 認証は OAuth Device Flow または GitHub App を利用。
  - データ保存はメモリ開始、必要に応じて SQLite へ拡張。
- **代替構成 (Web)**: Next.js + Node/TypeScript。
  - `/api/repos` を用意し、サーバー側で Octokit を利用。
  - フロントエンド側の `loadRepos()` を API 呼び出しに差し替え。

## 9. 初期実装スケルトン
- React コンポーネント `RepoBoard` で以下を実現:
  - 初期マウント時に `loadRepos()` を呼び出して状態管理。
  - `useMemo` で検索・ソート・列分類を処理。
  - カードはアンカーリンクで GitHub を開く。
- `loadRepos()` は MVP 開発初期はモックデータで実装し、Octokit 呼び出しに差し替え可能。
- 相対時間表示ユーティリティ `timeAgo()` を利用。
- 列情報は `COLUMNS: ColumnKey[] = ["Active","Stale","Dormant","Archived"];` で定義。

## 10. 非機能要件
- ブラウザ / デスクトップいずれの実装でもクリック時に GitHub リポジトリが確実に開くこと。
- レンダリングレスポンス: 初期表示時に取得したリポジトリは即時分類・表示されること。
- 保存ビューは永続ストレージ（ブラウザは `localStorage`、Tauri は `tauri-plugin-store` など）で 5 件まで管理。

## 11. MVP 完了判定
- 指定フィールドを取得し、分類ルールに従って 4 列に表示できること。
- トップバーからの検索とソートが正しく機能すること。
- カードクリックで対象リポジトリの GitHub ページが開くこと。
- 保存ビューを 1 件以上保持・復元でき、検索キーワードと並び替え条件が再現されること。

## 12. 初期開発タスク (1〜2 日想定)
1. 認証方式の選定と実装（OAuth Device Flow または GitHub App）。
2. Octokit を利用したリポジトリデータ収集（GraphQL 推奨）。
3. `RepoBoard` UI の実装とモックデータでの動作確認。
4. `loadRepos()` を Octokit 実装へ置換。
5. 分類閾値の設定化と保存ビュー機能（永続保存で最大 5 件）実装。

## 13. 今後の拡張候補（MVP 範囲外）
- ドラッグ＆ドロップによる列間移動。
- 複数保存ビュー管理と共有。
- 通知・一括操作などの高度な管理機能。
- CI 状況や Issue/PR 情報の追加表示。
