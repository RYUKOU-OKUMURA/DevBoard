# GitHub Dashboard

GitHub のリポジトリをボード（かんばん）形式で俯瞰し、更新状況を素早く把握するためのデスクトップ／Web 兼用 MVP プロジェクトです。  
リポジトリカードを列ごとに自動分類し、クリックで GitHub の該当ページを開ける最小体験を提供します。

## 主な特徴
- Active / Stale / Dormant / Archived の 4 列でリポジトリを分類表示
- テキスト検索（name / topic / description / primaryLanguage に対応）
- 最終更新日または名前での並び替え
- 最大 5 件まで保存できるカスタムビュー（検索語・並び順）
- バックエンド経由の GitHub API プロキシ（GraphQL 想定）

詳細要件は `requirements.md`、実行計画は `execution_plan.md` を参照してください。

## 技術スタック（想定）
- UI: React + TypeScript
- デスクトップ: Tauri
- Web 代替案: Next.js (App Router / Pages いずれも可)
- データ取得: Octokit（OAuth Device Flow または GitHub App を利用）
- 保存ビュー: `localStorage` もしくは `tauri-plugin-store`

## 開発環境の準備
1. **Node.js / パッケージマネージャー**
   - Node.js 18+ を推奨。
   - `npm` をインストール（Node.js に付属）。

2. **リポジトリの取得**
   ```bash
   git clone <this-repo-url>
   cd GitHub_Dashboard
   ```

3. **依存関係のインストール**
   ```bash
   npm install
   ```

4. **GitHub 認証の準備**

   **方法1: Personal Access Token を使用（推奨・簡単）**

   a. GitHub で Personal Access Token を作成:
      - https://github.com/settings/tokens/new にアクセス
      - Note: "GitHub Dashboard" など任意の名前を入力
      - Expiration: 任意の期限を選択（90 days など）
      - スコープ:
        - `repo` (プライベートリポジトリも含める場合)
        - または `public_repo` (パブリックリポジトリのみの場合)
      - "Generate token" をクリックしてトークンをコピー

   b. `.env` ファイルを作成:
      ```bash
      cp .env.example .env
      ```

   c. `.env` ファイルを編集して、トークンを設定:
      ```
      VITE_GITHUB_TOKEN=ghp_your_token_here
      ```

   **方法2: プロキシサーバー経由（高度）**

   セキュリティ上の理由でトークンをフロントエンドに含めたくない場合:
   - バックエンドプロキシサーバーを実装
   - `.env` に以下を設定:
     ```
     # VITE_GITHUB_TOKEN は設定しない
     VITE_API_PROXY_BASE_URL=http://localhost:3000/api
     ```

## 開発コマンド

```bash
# ローカル開発サーバーを起動（Tauri ウィンドウが開きます）
npm run dev

# 本番ビルド
npm run build

# テスト実行
npm test

# 単一テストを実行
npm test -- src/utils/classifyRepo.test.ts

# テスト UI を表示
npm run test:ui

# Linting チェック
npm run lint

# Linting エラーを自動修正
npm run lint:fix
```

## プロジェクト構成
```text
GitHub_Dashboard/
├─ README.md                 # 本ドキュメント
├─ CLAUDE.md                 # Claude Code ガイダンス
├─ requirements.md           # MVP 要件定義
├─ execution_plan.md         # 実装タスクとチェックリスト
├─ package.json              # npm パッケージ設定
├─ package-lock.json         # npm 依存関係ロック
├─ tsconfig.json             # TypeScript 設定
├─ vite.config.ts            # Vite ビルド設定
├─ tailwind.config.js        # Tailwind CSS 設定
├─ tauri.conf.json           # Tauri アプリ設定
├─ .env.example              # 環境変数テンプレート
├─ .gitignore                # Git 除外ファイル
├─ .eslintrc.cjs             # ESLint 設定
└─ src/
   ├─ main.tsx               # React エントリーポイント
   ├─ App.tsx                # ルートコンポーネント
   ├─ App.css                # グローバルスタイル
   ├─ components/            # React コンポーネント
   │  ├─ RepoBoard.tsx       # メインボード
   │  ├─ TopBar.tsx          # トップバー
   │  ├─ Column.tsx          # 列
   │  └─ RepoCard.tsx        # リポジトリカード
   ├─ utils/                 # ユーティリティ関数
   │  ├─ classifyRepo.ts     # 分類ロジック
   │  ├─ timeAgo.ts          # 相対時間表示
   │  ├─ search.ts           # 検索フィルタリング
   │  └─ storage.ts          # ローカルストレージ
   ├─ api/                   # API 通信
   │  ├─ octokit.ts          # Octokit 初期化
   │  └─ repos.ts            # リポジトリ取得
   └─ types/
      └─ index.ts            # TypeScript 型定義
```

## 実装手順のガイド
1. 環境準備（フェーズ 0）
   - Node.js / Tauri / Next.js の雛形を作成。
2. 認証・API 基盤（フェーズ 1）
   - Octokit で `Repo` に必要なフィールドを取得する GraphQL クエリを実装。
3. データ管理ユーティリティ（フェーズ 2）
   - `classifyRepo()` や `timeAgo()` のロジックとテストを追加。
4. UI 実装（フェーズ 3）
   - 要件に沿った `RepoBoard` コンポーネントを組み立て。
5. 保存ビュー機能（フェーズ 4）
   - 永続ストレージを利用した CRUD を整備。
6. 結合・検証（フェーズ 5）
   - 実データでの動作確認とドキュメント更新。

各フェーズの詳細タスクは `execution_plan.md` のチェックリストを利用してください。

## 開発中の注意点
- GitHub API のレート制限に注意し、必要に応じてキャッシュ（SQLite 等）を導入。
- 保存ビューのスキーマは将来拡張を考慮し、バージョン管理できる設計が望ましい。
- Tauri 実装の場合、外部ブラウザでのリンクオープンに `tauri::shell` などの呼び出しが必要。

## テスト

### 自動テスト（単体テスト）
```bash
# 全テストを実行
npm test

# テスト UI で実行
npm run test:ui

# 特定のテストのみ実行
npm test -- src/lib/__tests__/classifyRepo.test.ts
```

**テストカバレッジ:**
- リポジトリ分類ロジック（`classifyRepo`）
- 相対時間表示（`timeAgo`）
- 検索・フィルタリング・ソート機能
- 保存ビュー CRUD 操作
- エラーハンドリング

### 手動テスト（動作確認）

1. **モックデータでの動作確認**
   ```bash
   npm run dev
   ```
   ブラウザで http://localhost:5173 を開く
   - 4列のカンバンボードが表示されることを確認
   - 検索バーにキーワードを入力して、リポジトリがフィルタされることを確認
   - 並び替え（Last Updated / Name）が動作することを確認
   - 保存ビューの作成・選択・削除が動作することを確認

2. **実データでの動作確認**（`.env` に `VITE_GITHUB_TOKEN` を設定した場合）
   - 画面上部の「Load Real Data」ボタンをクリック
   - 自分のGitHubリポジトリが取得されることを確認
   - リポジトリカードをクリックして、GitHubページが開くことを確認
   - 検索・並び替え・保存ビューが実データでも動作することを確認

3. **エラーハンドリングの確認**
   - 不正なトークンを設定して、エラーメッセージが表示されることを確認
   - ネットワークを切断して、適切なエラー処理がされることを確認

## ライセンス
- ライセンスは未定です。利用ポリシーが決まり次第、本セクションを更新してください。

## コントリビュート
- Issue や Pull Request を送る前に、要件定義書と実行計画に目を通して合意済みのスコープを確認してください。
- コントリビュートガイドラインは今後整備予定です。

