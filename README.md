# GitHub Dashboard

GitHub のリポジトリをボード（かんばん）形式で俯瞰し、更新状況を素早く把握するための Web アプリケーションです。
リポジトリカードを列ごとに自動分類し、クリックで GitHub の該当ページを開ける最小体験を提供します。

## 主な特徴

- **4列の自動分類**: Active / Stale / Dormant / Archived でリポジトリを視覚的に整理
- **プライベートリポジトリ対応**: GitHub OAuth 認証により、プライベートリポジトリも表示可能
- **高速検索**: name / topic / description / primaryLanguage に対応したテキスト検索
- **柔軟な並び替え**: 最終更新日または名前での並び替え
- **保存ビュー**: 最大 5 件まで保存できるカスタムビュー（検索語・並び順）
- **セキュアな認証**: Cloudflare Workers + KV による暗号化セッション管理

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite + Tailwind CSS
- **デプロイ**: Cloudflare Pages
- **バックエンド**: Cloudflare Workers Functions
- **認証**: GitHub OAuth Apps
- **セッション管理**: Cloudflare KV (AES-256-GCM 暗号化)
- **データ取得**: GitHub GraphQL API（Octokit クライアント + Cloudflare プロキシ）

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Pages (静的ホスティング)                      │
│  - React フロントエンド                                  │
│  - GitHub OAuth ログイン画面                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Workers (Functions)                          │
│  - /api/auth/* : OAuth認証フロー                        │
│  - /api/github/* : GitHub API プロキシ                  │
│  - セッション管理（KV Storage + 暗号化）                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ GitHub API                                              │
│  - 各ユーザーのアクセストークンで呼び出し                │
└─────────────────────────────────────────────────────────┘
```

## セキュリティ機能

- **トークン暗号化**: AES-256-GCM でアクセストークンを暗号化してKVに保存
- **Cookie保護**: HttpOnly, Secure, SameSite=Lax 属性を設定
- **CSRF対策**: OAuth state パラメータによる検証
- **セッション有効期限**: 30日間（利便性とセキュリティのバランス）
- **セキュリティヘッダー**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

## 開発環境のセットアップ

詳細な手順は [docs/development.md](docs/development.md) を参照してください。

### クイックスタート

1. **リポジトリのクローン**
   ```bash
   git clone <this-repo-url>
   cd GitHub_Dashboard
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   npm install -g wrangler
   ```

3. **GitHub OAuth App の作成**

   開発用の OAuth App を作成します：
   - https://github.com/settings/developers にアクセス
   - "New OAuth App" をクリック
   - Application name: `GitHub Dashboard (Dev)`
   - Homepage URL: `http://localhost:8788`
   - Authorization callback URL: `http://localhost:8788/api/auth/callback`

4. **環境変数の設定**
   ```bash
   cp .dev.vars.example .dev.vars
   ```

   `.dev.vars` を編集して以下を設定：
   ```bash
   GITHUB_CLIENT_ID=your_dev_client_id
   GITHUB_CLIENT_SECRET=your_dev_client_secret
   SESSION_SECRET=$(openssl rand -hex 32)
   ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```
   ※ `SESSION_SECRET` は将来的な署名付き Cookie 対応向けの予約キーです（現在のビルドでもランダム文字列を設定しておく運用としています）。

5. **KV バインディングについて**

   本番環境のバインディングは Cloudflare Pages ダッシュボードで管理し、`wrangler.toml` には ID を記載しません（`wrangler.toml` にも注記済み）。ローカル開発では `wrangler pages dev` が指定した名前で一時的な KV を用意するため、追加設定は不要です。

6. **開発サーバーの起動**

   2つのターミナルで以下を実行：

   **ターミナル1:**
   ```bash
   npm run build -- --watch
   ```

   **ターミナル2:**
   ```bash
   wrangler pages dev dist --kv=SESSIONS --port=8788
   ```

7. **ブラウザでアクセス**
   ```
   http://localhost:8788
   ```

## 開発コマンド

```bash
# 本番ビルド
npm run build

# テスト実行
npm test

# テスト UI を表示
npm run test:ui

# Linting チェック
npm run lint

# Linting エラーを自動修正
npm run lint:fix
```

## デプロイ

Cloudflare Pages へのデプロイ手順は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照してください。

### デプロイ概要

1. Cloudflare Pages プロジェクトを作成
2. GitHub リポジトリと連携
3. ビルド設定: `npm run build` / `dist`
4. 本番用 KV Namespace を作成
5. 環境変数（Secrets）を設定
6. GitHub OAuth App の callback URL を更新
7. デプロイ実行

## プロジェクト構成

```
GitHub_Dashboard/
├── README.md                  # 本ドキュメント
├── CLAUDE.md                  # Claude Code ガイダンス
├── requirements.md            # MVP 要件定義
├── docs/
│   ├── development.md         # ローカル開発環境セットアップ
│   ├── DEPLOYMENT.md          # デプロイ手順書
│   └── PRIVACY.md             # プライバシーポリシー
├── functions/                 # Cloudflare Workers Functions
│   ├── _middleware.ts         # CORS、セキュリティヘッダー
│   ├── api/
│   │   ├── auth/              # 認証エンドポイント
│   │   │   ├── login.ts       # OAuth開始
│   │   │   ├── callback.ts    # OAuth コールバック
│   │   │   ├── logout.ts      # ログアウト
│   │   │   └── me.ts          # ユーザー情報取得
│   │   └── github/
│   │       └── [[path]].ts    # GitHub APIプロキシ
│   └── lib/
│       ├── types.ts           # 型定義
│       ├── crypto.ts          # トークン暗号化/復号化
│       └── session.ts         # セッション管理
├── src/
│   ├── main.tsx               # React エントリーポイント
│   ├── App.tsx                # ルートコンポーネント
│   ├── contexts/
│   │   └── AuthContext.tsx    # 認証状態管理
│   ├── components/            # React コンポーネント
│   │   ├── LoginPage.tsx      # ログイン画面
│   │   ├── RepoBoard.tsx      # メインボード
│   │   ├── TopBar.tsx         # トップバー
│   │   ├── RepoColumn.tsx     # 列
│   │   └── RepoCard.tsx       # リポジトリカード
│   ├── lib/                   # ユーティリティ関数
│   │   ├── classifyRepo.ts    # 分類ロジック
│   │   ├── timeAgo.ts         # 相対時間表示
│   │   └── search.ts          # 検索フィルタリング
│   ├── storage/               # ローカルストレージ
│   ├── api/                   # API 通信
│   │   └── octokit.ts         # GitHub API クライアント
│   └── types/
│       └── index.ts           # TypeScript 型定義
├── wrangler.toml              # Cloudflare Workers 設定
├── .dev.vars.example          # 環境変数テンプレート
├── vite.config.ts             # Vite ビルド設定
├── tailwind.config.js         # Tailwind CSS 設定
└── package.json               # npm パッケージ設定
```

## リポジトリ分類ロジック

リポジトリは以下のルールで自動分類されます：

```
if isArchived → Archived
else if daysSince(pushedAt) ≤ 60 → Active
else if daysSince(pushedAt) ≤ 180 → Stale
else → Dormant
```

しきい値（60日/180日）は将来的に設定可能にする予定です。

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

1. **ログイン機能**
   - ログインボタンをクリックして GitHub OAuth 認証を実行
   - 認証後、ダッシュボードにリダイレクトされることを確認

2. **リポジトリ表示**
   - 自分の GitHub リポジトリ（プライベート含む）が表示されることを確認
   - 4列に正しく分類されていることを確認

3. **検索機能**
   - 検索バーにキーワードを入力して、リポジトリがフィルタされることを確認

4. **並び替え**
   - Last Updated / Name の並び替えが動作することを確認

5. **保存ビュー**
   - 保存ビューの作成・選択・削除が動作することを確認

6. **カスタムリポジトリ入力**
   - パブリックリポジトリのURL（例: `facebook/react`）を入力して表示されることを確認

7. **ログアウト**
   - ログアウトボタンをクリックしてログアウトできることを確認

## プライバシーとデータ管理

- このアプリケーションは、GitHub OAuth を通じて取得したアクセストークンを暗号化して Cloudflare KV に保存します
- セッションは30日間有効です
- 収集した情報は第三者に共有されません
- 詳細は [docs/PRIVACY.md](docs/PRIVACY.md) を参照してください

## トラブルシューティング

詳細なトラブルシューティングガイドは [docs/development.md](docs/development.md) を参照してください。

詳しい結果（ログと診断）の見方は [docs/detailed-results.md](docs/detailed-results.md) を参照してください。実行環境の準備状況は /api/auth/status で確認できます。

Cloudflare Pages の設定画面がロックされて編集できない場合（「このプロジェクトのバインディングは wrangler.toml を通じて管理されています」と表示される）は、[docs/pages-config-modes.md](docs/pages-config-modes.md) を参照して、ダッシュボード管理モードへの切り替え手順（推奨）または Wrangler 管理モードでの設定方法を確認してください。

### よくある問題

**Q: ログインできない**
- GitHub OAuth App の callback URL が正しく設定されているか確認してください
- 環境変数（`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`）が正しく設定されているか確認してください

**Q: プライベートリポジトリが表示されない**
- GitHub OAuth App のスコープに `repo` が含まれているか確認してください（`functions/api/auth/login.ts`）

**Q: セッションが保存されない**
- KV Namespace が正しく作成・バインディングされているか確認してください

## コスト見積もり

Cloudflare の無料プランで運用可能：

| サービス | 無料枠 | 想定使用量 |
|---------|--------|-----------|
| Cloudflare Pages | 月500ビルド、無制限リクエスト | ビルド: 数回/日 |
| Cloudflare Workers | 日10万リクエスト | 数百〜数千/日 |
| Cloudflare KV | 日1,000書き込み、10万読み込み | 数十〜数百/日 |

**結論**: 個人利用〜小規模公開なら完全無料で運用可能

## 今後の改善案

- [ ] GraphQL API への完全移行
- [ ] リフレッシュトークン対応（GitHub Apps移行時）
- [ ] しきい値のカスタマイズ機能
- [ ] ドラッグ&ドロップによる列間移動
- [ ] CI/CD ステータスの表示
- [ ] Issue/PR 情報の統合
- [ ] パフォーマンスモニタリング（Sentry等）

## ライセンス

ライセンスは未定です。利用ポリシーが決まり次第、本セクションを更新してください。

## コントリビュート

Issue や Pull Request を送る前に、要件定義書（`requirements.md`）と実行計画（`execution_plan.md`）に目を通して合意済みのスコープを確認してください。

## 関連リンク

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

---

**最終更新**: 2025-10-24
