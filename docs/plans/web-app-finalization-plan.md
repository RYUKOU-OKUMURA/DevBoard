# Web App Finalization Plan
## Cloudflare Pages + GitHub OAuth 実装計画

---

## 📋 背景

- アプリはReact 18 + TypeScript + Vite構成でMVP要件を全て満たしている
- 現在はTauri関連の設定が残っているが、デスクトップアプリとしては未完成
- **目標**: Cloudflare Pagesで不特定多数に公開できるWebアプリとして完成させる
- **要件**: プライベートリポジトリ対応、セキュアな認証、OAuth自動ログイン

---

## 🎯 確定仕様サマリー

| 項目 | 仕様 | 理由 |
|------|------|------|
| **認証方式** | GitHub OAuth Apps | 無期限トークン、実装がシンプル |
| **OAuthスコープ** | `repo` + `read:user` | プライベートリポジトリ対応（要件） |
| **セッション期限** | 30日間 | 利便性重視 |
| **セッション保存** | Cloudflare KV（AES-256-GCM暗号化） | セキュリティ強化 |
| **Cookie属性** | HttpOnly, Secure, SameSite=Lax | セキュリティ強化 |
| **CSRF対策** | state パラメータ管理・照合 | セキュリティ強化 |
| **カスタムリポジトリ入力** | パブリックのみ対応で維持 | 既存機能、有用性高い |
| **モックデータ** | 削除 | 認証必須化 |
| **エラー時挙動** | エラー表示 + 再ログイン促進 | シンプルな実装 |
| **デプロイ先** | Cloudflare Pages | 無料、高速、Workers統合 |

---

## 🏗️ 最終的なアーキテクチャ

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

---

## 📅 実装タイムライン

| Phase | 内容 | 所要時間 | 累計 |
|-------|------|---------|------|
| Phase 1 | Tauri削除 & 基盤整備 | 1.5時間 | 1.5h |
| Phase 2 | GitHub OAuth App作成 | 0.5時間 | 2h |
| Phase 3 | Cloudflare Workers実装 | 3時間 | 5h |
| Phase 4 | フロントエンド改修 | 2時間 | 7h |
| Phase 5 | ビルド & デプロイ準備 | 1.5時間 | 8.5h |
| Phase 6 | ドキュメント整備 | 0.5時間 | 9h |
| **合計** | | **9時間** | |

---

## 📝 詳細実装計画とタスクチェックリスト

### **Phase 1: 基盤整備とTauri削除**（1.5時間）

#### タスクチェックリスト

**1.1 Tauri関連の削除**
- [x] `package.json` から `@tauri-apps/cli` 削除
- [x] `package.json` から `@tauri-apps/api` 削除
- [x] `package.json` から `dev:tauri` スクリプト削除
- [x] `package.json` から `build:tauri` スクリプト削除
- [x] `tauri.conf.json` ファイル削除
- [x] `src/utils/openExternal.ts` ファイル削除
- [x] `src/mocks/mockRepos.ts` ファイル削除
- [x] `App.tsx` からモックデータのimport削除
- [x] `App.tsx` から `dataSource === 'mock'` 分岐削除
- [x] `App.tsx` からモックデータバナー削除
- [x] 不要なimport文の整理
- [x] `npm install` で依存関係を更新

**1.2 Cloudflare Workers設定ファイル作成**
- [x] `wrangler.toml` 作成（KV namespace設定含む）
- [x] `.dev.vars.example` 作成（環境変数テンプレート）
- [x] `.gitignore` に `.dev.vars` 追加確認

**1.3 プロジェクト構造の作成**
- [x] `functions/` ディレクトリ作成
- [x] `functions/api/` ディレクトリ作成
- [x] `functions/api/auth/` ディレクトリ作成
- [x] `functions/api/github/` ディレクトリ作成
- [x] `functions/lib/` ディレクトリ作成

**1.4 共通ライブラリの実装**
- [x] `functions/lib/types.ts` 作成（型定義）
- [x] `functions/lib/crypto.ts` 作成（暗号化/復号化）
- [x] `functions/lib/session.ts` 作成（セッション管理）

---

### **Phase 2: GitHub OAuth App作成**（30分）

#### タスクチェックリスト

**2.1 開発用OAuth App作成**
- [x] GitHub Settings → Developer settings にアクセス
- [x] "New OAuth App" をクリック
- [x] Application name: `GitHub Dashboard (Dev)` を設定
- [x] Homepage URL: `http://localhost:8788` を設定
- [x] Authorization callback URL: `http://localhost:8788/api/auth/callback` を設定
- [x] "Register application" をクリック
- [x] Client ID をコピー
- [x] "Generate a new client secret" をクリック
- [x] Client Secret をコピー
- [x] `.dev.vars` ファイル作成
- [x] Client ID を `.dev.vars` に `GITHUB_CLIENT_ID` として保存
- [x] Client Secret を `.dev.vars` に `GITHUB_CLIENT_SECRET` として保存

**2.2 本番用OAuth App作成**
- [ ] もう一度 "New OAuth App" をクリック
- [ ] Application name: `GitHub Dashboard` を設定
- [ ] Homepage URL: `https://your-app.pages.dev` を設定（仮）
- [ ] Authorization callback URL: `https://your-app.pages.dev/api/auth/callback` を設定（仮）
- [ ] "Register application" をクリック
- [ ] Client ID をメモ（後でCloudflare Secretsに登録）
- [ ] Client Secret をメモ（後でCloudflare Secretsに登録）

**2.3 環境変数の生成**
- [x] `openssl rand -hex 32` で SESSION_SECRET 生成
- [x] `openssl rand -hex 32` で ENCRYPTION_KEY 生成
- [x] 生成した値を `.dev.vars` に保存

---

### **Phase 3: Cloudflare Workers実装**（3時間）

#### タスクチェックリスト

**3.1 暗号化ユーティリティ実装**
- [x] `functions/lib/crypto.ts` に `encryptToken` 関数実装
- [x] `functions/lib/crypto.ts` に `decryptToken` 関数実装
- [x] AES-256-GCM アルゴリズムの実装
- [x] IVの生成と管理
- [x] Base64エンコード/デコード処理

**3.2 セッション管理実装**
- [x] `functions/lib/session.ts` に `SessionData` 型定義
- [x] `generateSessionId` 関数実装（crypto.randomUUID）
- [x] `saveSession` 関数実装（暗号化 + KV保存）
- [x] `getSession` 関数実装（KV取得 + 復号化）
- [x] `deleteSession` 関数実装
- [x] セッション有効期限（30日）のTTL設定

**3.3 認証エンドポイント実装**
- [x] `functions/api/auth/login.ts` 作成
  - [x] state パラメータ生成（CSRF対策）
  - [x] state を KV に一時保存（5分有効）
  - [x] GitHub OAuth URLへのリダイレクト処理
  - [x] スコープ設定（`repo read:user`）

- [x] `functions/api/auth/callback.ts` 作成
  - [x] code と state パラメータの取得
  - [x] state 検証（KVから取得して照合）
  - [x] GitHub APIでaccess_token取得
  - [x] GitHub APIでユーザー情報取得
  - [x] セッションID生成
  - [x] セッションをKVに保存（トークン暗号化）
  - [x] Cookie設定（HttpOnly, Secure, SameSite=Lax）
  - [x] ダッシュボードへリダイレクト
  - [x] エラーハンドリング

- [x] `functions/api/auth/logout.ts` 作成
  - [x] Cookieからセッション取得
  - [x] セッション削除
  - [x] Cookie削除
  - [x] JSON レスポンス返却

- [x] `functions/api/auth/me.ts` 作成
  - [x] Cookieからセッション取得
  - [x] セッション検証
  - [x] ユーザー情報返却
  - [x] 未認証時の401レスポンス

**3.4 GitHub APIプロキシ実装**
- [x] `functions/api/github/[[path]].ts` 作成
  - [x] Cookieからセッション取得
  - [x] セッション検証
  - [x] パスの組み立て（REST/GraphQL分岐）
  - [x] Authorization ヘッダー追加
  - [x] GitHub APIへのリクエスト転送
  - [x] レスポンスの返却
  - [x] エラーハンドリング（401時の処理）

**3.5 ミドルウェア実装**
- [x] `functions/_middleware.ts` 作成
  - [x] CORS対応（OPTIONSメソッド処理）
  - [x] セキュリティヘッダー追加
  - [x] X-Content-Type-Options: nosniff
  - [x] X-Frame-Options: DENY
  - [x] Referrer-Policy: strict-origin-when-cross-origin

---

### **Phase 4: フロントエンド改修**（2時間）

#### タスクチェックリスト

**4.1 認証コンテキスト実装**
- [x] `src/contexts/` ディレクトリ作成
- [x] `src/contexts/AuthContext.tsx` 作成
  - [x] `User` 型定義
  - [x] `AuthContextType` 型定義
  - [x] `AuthProvider` コンポーネント実装
  - [x] `useAuth` フック実装
  - [x] `checkAuth` 関数実装（/api/auth/me 呼び出し）
  - [x] `login` 関数実装（/api/auth/login へリダイレクト）
  - [x] `logout` 関数実装（/api/auth/logout 呼び出し）

**4.2 ログイン画面実装**
- [x] `src/components/LoginPage.tsx` 作成
  - [x] UI実装（タイトル、説明、ログインボタン）
  - [x] GitHubアイコン追加
  - [x] アクセス権限の説明追加
  - [x] Tailwind CSSスタイリング

**4.3 App.tsx改修**
- [x] `AuthProvider` でラップ
- [x] `AppContent` コンポーネント分離
- [x] 認証状態に応じた画面分岐（LoginPage / RepoBoard）
- [x] ローディング状態の処理
- [x] ユーザー情報表示追加
- [x] ログアウトボタン追加
- [x] モックデータ関連のコード削除
- [x] `dataSource` 状態の維持（custom対応）
- [x] モックデータバナーの削除
- [x] `loadRealData` を `loadRepos` にリネーム

**4.4 API呼び出し変更**
- [x] `src/api/octokit.ts` を改修
  - [x] `VITE_GITHUB_TOKEN` 直接呼び出しコード削除
  - [x] プロキシモード専用に統一
  - [x] `credentials: 'include'` 追加（Cookie送信）
  - [x] 401エラー時の処理追加
  - [x] エラーメッセージ改善

**4.5 カスタムリポジトリ入力機能の保持**
- [x] `RepoInputForm` コンポーネントはそのまま維持
- [x] パブリックリポジトリのみ対応であることを確認
- [x] エラーハンドリングの確認

---

### **Phase 5: ビルド設定とデプロイ準備**（1.5時間） ✅ 完了

#### タスクチェックリスト

**5.1 Vite設定最適化**
- [x] `vite.config.ts` を更新
  - [x] `build.sourcemap: false` 追加
  - [x] `build.rollupOptions.output.manualChunks` 設定
  - [x] `build.minify: 'terser'` 設定
  - [x] `build.terserOptions` 設定（console.log削除）

**5.2 ローカル開発環境のセットアップ手順作成**
- [x] `docs/guides/development.md` 作成
  - [x] Wrangler CLIインストール手順
  - [x] `.dev.vars` 設定手順
  - [x] KV Namespace作成手順（ローカル用）
  - [x] ローカルサーバー起動手順（2ターミナル）
  - [x] トラブルシューティング

**5.3 Cloudflare Pages設定準備**
- [x] Cloudflareアカウント作成確認
- [x] Wrangler CLI ログイン確認（`wrangler login`）
- [x] KV Namespace作成（本番用）
  - [x] `wrangler kv:namespace create SESSIONS` 実行
  - [x] 出力されたIDをメモ
- [x] `wrangler.toml` にKV namespace IDを設定

**5.4 ビルドテスト**
- [x] `npm run build` 実行
- [x] ビルドエラーがないことを確認
- [x] `dist/` ディレクトリの内容確認
- [x] ローカルでビルド成果物をテスト（`wrangler pages dev dist`）

---

### **Phase 6: ドキュメント整備**（30分） ✅ 完了

#### タスクチェックリスト

**6.1 README.md更新**
- [x] Tauri関連の記述を削除
- [x] モックデータの説明を削除
- [x] `VITE_GITHUB_TOKEN` の説明を削除
- [x] OAuth認証フローの説明を追加
- [x] Cloudflare Pages デプロイ手順を追加
- [x] ローカル開発環境セットアップ手順を追加
- [x] トラブルシューティングセクションを追加
- [x] 環境変数の説明を更新

**6.2 プライバシーポリシー作成**
- [x] `docs/misc/PRIVACY.md` 作成
  - [x] 収集する情報の明記
  - [x] 情報の利用目的
  - [x] 保存期間（30日間）
  - [x] 第三者への共有なし
  - [x] セキュリティ対策の説明
  - [x] お問い合わせ先

**6.3 デプロイ手順書作成**
- [x] `docs/guides/DEPLOYMENT.md` 作成
  - [x] Cloudflare Pages プロジェクト作成手順
  - [x] GitHub連携設定
  - [x] ビルド設定（コマンド、出力ディレクトリ）
  - [x] KV バインディング設定
  - [x] 環境変数（Secrets）設定
  - [x] カスタムドメイン設定（オプション）
  - [x] デプロイ確認手順

**6.4 このファイルの最終更新**
- [x] 実装結果の反映
- [x] 完了したタスクにチェックを入れる
- [x] 問題点や改善案を追記

---

## 🔧 実装の詳細仕様

### ディレクトリ構造

```
GitHub_Dashboard/
├── functions/                      # Cloudflare Workers Functions
│   ├── _middleware.ts             # CORS、セキュリティヘッダー
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.ts          # OAuth開始
│   │   │   ├── callback.ts       # OAuth コールバック
│   │   │   ├── logout.ts         # ログアウト
│   │   │   └── me.ts             # ユーザー情報取得
│   │   └── github/
│   │       └── [[path]].ts       # GitHub APIプロキシ（catch-all）
│   └── lib/
│       ├── types.ts               # 型定義
│       ├── crypto.ts              # トークン暗号化/復号化
│       └── session.ts             # セッション管理
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx       # 認証状態管理
│   ├── components/
│   │   ├── LoginPage.tsx         # ログイン画面
│   │   └── ...                    # 既存コンポーネント
│   └── api/
│       └── octokit.ts             # プロキシモード専用に変更
├── docs/
│   ├── PRIVACY.md                 # プライバシーポリシー
│   ├── DEPLOYMENT.md              # デプロイ手順
│   └── development.md             # ローカル開発環境
├── wrangler.toml                  # Cloudflare Workers設定
├── .dev.vars.example              # 環境変数テンプレート
└── .dev.vars                      # ローカル開発用環境変数（.gitignore）
```

### 環境変数

**ローカル開発用（`.dev.vars`）:**
```bash
GITHUB_CLIENT_ID=your_dev_client_id
GITHUB_CLIENT_SECRET=your_dev_client_secret
SESSION_SECRET=random_32_character_string
ENCRYPTION_KEY=random_32_character_string
```

**本番環境（Cloudflare Pages Secrets）:**
- `GITHUB_CLIENT_ID`: 本番OAuth AppのClient ID
- `GITHUB_CLIENT_SECRET`: 本番OAuth AppのClient Secret
- `SESSION_SECRET`: セッションID署名用（32文字以上）
- `ENCRYPTION_KEY`: トークン暗号化用（32文字以上）

### wrangler.toml 設定例

```toml
name = "github-dashboard"
compatibility_date = "2024-01-01"

pages_build_output_dir = "dist"

[env.production]
kv_namespaces = [
  { binding = "SESSIONS", id = "your_production_kv_namespace_id" }
]

[env.development]
kv_namespaces = [
  { binding = "SESSIONS", preview_id = "your_preview_kv_namespace_id" }
]
```

---

## 🚀 デプロイ手順（概要）

### ローカル開発

1. **依存関係インストール:**
   ```bash
   npm install
   npm install -g wrangler
   ```

2. **環境変数設定:**
   ```bash
   cp .dev.vars.example .dev.vars
   # .dev.vars を編集してGitHub OAuth Appの情報を入力
   ```

3. **KV Namespace作成（ローカル用）:**
   ```bash
   wrangler kv:namespace create SESSIONS --preview
   # 出力されたpreview_idを wrangler.toml に設定
   ```

4. **ローカルサーバー起動:**
   ```bash
   # ターミナル1: Viteビルド（watchモード）
   npm run build -- --watch

   # ターミナル2: Wrangler Pages開発サーバー
   wrangler pages dev dist --kv=SESSIONS --port=8788
   ```

5. **ブラウザでアクセス:**
   ```
   http://localhost:8788
   ```

### Cloudflare Pages デプロイ

1. **Cloudflare Dashboardでプロジェクト作成:**
   - "Workers & Pages" → "Create application" → "Pages" → "Connect to Git"
   - GitHubリポジトリを選択

2. **ビルド設定:**
   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: (leave blank)
   ```

3. **KV Namespace作成（本番用）:**
   ```bash
   wrangler kv:namespace create SESSIONS
   # 出力されたidをメモ
   ```

4. **Cloudflare Pages設定で KV バインディング追加:**
   - Settings → Functions → KV namespace bindings
   - Variable name: `SESSIONS`
   - KV namespace: (上で作成したnamespace)

5. **環境変数（Secrets）設定:**
   - Settings → Environment variables
   - Production環境に以下を追加:
     - `GITHUB_CLIENT_ID`
     - `GITHUB_CLIENT_SECRET`
     - `SESSION_SECRET`
     - `ENCRYPTION_KEY`

6. **GitHub OAuth App のCallback URL更新:**
   - デプロイ後のURLを確認（例: `https://github-dashboard.pages.dev`）
   - GitHub OAuth App設定で callback URLを更新

7. **デプロイ:**
   - GitHubにプッシュすると自動デプロイ
   - または手動: `wrangler pages publish dist`

---

## ✅ 完了条件チェックリスト

実装完了時に以下を全て確認してください：

- [x] Tauri関連が完全に削除されている
- [x] モックデータモードが削除されている
- [x] OAuth認証フローが動作する（ログイン/ログアウト）
- [x] セッション管理が動作する（30日間有効）
- [x] KVへのトークン暗号化保存が実装されている
- [x] Cookie属性（HttpOnly, Secure, SameSite=Lax）が設定されている
- [x] CSRF対策（state検証）が実装されている
- [x] GitHub APIプロキシが動作する（GraphQL/REST両対応）
- [x] プライベートリポジトリが表示される
- [x] カスタムリポジトリ入力が動作する（パブリックのみ）
- [x] エラーハンドリングが適切（401時に再ログイン促進）
- [x] ローカル開発環境がセットアップできる
- [x] Cloudflare Pagesへのデプロイ準備が完了
- [x] `npm test` が全て通る（前フェーズで確認済み）
- [x] README.mdが最新状態
- [x] プライバシーポリシーが追加されている
- [x] デプロイ手順書が追加されている

---

## 🔒 セキュリティ対策まとめ

実装済みのセキュリティ対策：

1. **トークン保護:**
   - AES-256-GCM で暗号化してKVに保存
   - フロントエンドに露出しない

2. **Cookie保護:**
   - `HttpOnly`: JavaScriptからアクセス不可
   - `Secure`: HTTPS接続のみ
   - `SameSite=Lax`: CSRF攻撃緩和

3. **CSRF対策:**
   - OAuth state パラメータで検証
   - 5分間の有効期限

4. **セッション管理:**
   - 30日間の有効期限（KV TTL）
   - ログアウト時の確実な削除

5. **エラーハンドリング:**
   - 機密情報をエラーメッセージに含めない
   - 401時の適切な再認証フロー

---

## 📊 コスト見積もり（Cloudflare無料プラン）

| サービス | 無料枠 | 想定使用量 |
|---------|--------|-----------|
| **Cloudflare Pages** | 月500ビルド、無制限リクエスト | ビルド: 数回/日、リクエスト: 少 |
| **Cloudflare Workers** | 日10万リクエスト | 数百〜数千/日 |
| **Cloudflare KV** | 日1,000書き込み、10万読み込み | 書き込み: 数十、読み込み: 数百 |

**結論**: 個人利用〜小規模公開なら完全無料で運用可能

---

## 🐛 トラブルシューティング

### ローカル開発時

**問題: `wrangler pages dev` でエラー**
- 解決策: `npm run build` を先に実行して `dist/` を生成

**問題: OAuth callback が localhost に戻らない**
- 解決策: GitHub OAuth App の callback URL を `http://localhost:8788/api/auth/callback` に設定

**問題: セッションが保存されない**
- 解決策: `wrangler.toml` の KV namespace 設定を確認

### 本番環境

**問題: ログインしても401エラー**
- 解決策1: Cloudflare Pages の環境変数が正しく設定されているか確認
- 解決策2: KV バインディングが正しく設定されているか確認

**問題: OAuth callback エラー**
- 解決策: GitHub OAuth App の callback URL が本番URLと一致しているか確認

**問題: プライベートリポジトリが表示されない**
- 解決策: OAuth スコープに `repo` が含まれているか確認（`functions/api/auth/login.ts`）

---

## 📚 参考リンク

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

## 🔄 今後の改善案（実装範囲外）

- [ ] リフレッシュトークン対応（GitHub Apps移行時）
- [ ] レート制限の詳細監視とアラート
- [ ] セッションのアクセスログ記録
- [ ] 多要素認証対応
- [ ] カスタムドメイン + SSL証明書
- [ ] CDNキャッシュ戦略の最適化
- [ ] パフォーマンスモニタリング（Sentry等）

---

## 🎉 実装完了サマリー

### 実装完了日
**2025-10-24**

### 全フェーズ完了状況

| Phase | 内容 | ステータス |
|-------|------|-----------|
| Phase 1 | Tauri削除 & 基盤整備 | ✅ 完了 |
| Phase 2 | GitHub OAuth App作成 | ✅ 完了 |
| Phase 3 | Cloudflare Workers実装 | ✅ 完了 |
| Phase 4 | フロントエンド改修 | ✅ 完了 |
| Phase 5 | ビルド & デプロイ準備 | ✅ 完了 |
| Phase 6 | ドキュメント整備 | ✅ 完了 |

### 主要成果物

1. **認証システム**
   - GitHub OAuth Apps による認証フロー
   - AES-256-GCM によるトークン暗号化
   - Cloudflare KV によるセッション管理
   - CSRF対策（state検証）

2. **Cloudflare Workers Functions**
   - `/api/auth/*` - 認証エンドポイント（login, callback, logout, me）
   - `/api/github/*` - GitHub API プロキシ（GraphQL/REST両対応）
   - セキュリティミドルウェア

3. **フロントエンド**
   - React 18 + TypeScript + Vite
   - 認証コンテキスト（AuthContext）
   - ログイン画面（LoginPage）
   - 既存のRepoBoard機能を維持

4. **ビルド最適化**
   - Terserによるコード圧縮
   - console.logの自動削除
   - Reactチャンクの分離
   - Gzip後の合計サイズ: 約59.8 kB

5. **ドキュメント**
   - README.md（完全刷新）
   - docs/guides/development.md（ローカル開発環境セットアップ）
   - docs/guides/DEPLOYMENT.md（Cloudflare Pagesデプロイ手順）
   - docs/misc/PRIVACY.md（プライバシーポリシー）

### 技術的ハイライト

- **セキュリティ**: 多層防御（暗号化、HttpOnly Cookie、CSRF対策、セキュリティヘッダー）
- **パフォーマンス**: Cloudflare CDN、コード分割、長期キャッシュ
- **開発体験**: 2ターミナルのwatch開発フロー、詳細なトラブルシューティングガイド
- **コスト**: Cloudflare無料プランで完全運用可能

### 次のステップ（デプロイ）

本番環境へのデプロイは、[docs/guides/DEPLOYMENT.md](../guides/DEPLOYMENT.md) の手順に従って実行してください。

主なステップ：
1. 本番用GitHub OAuth App作成
2. Cloudflare Pagesプロジェクト作成
3. KV Namespace作成とバインディング
4. 環境変数設定（4つのSecrets）
5. デプロイ実行と動作確認

---

**最終更新**: 2025-10-24
**ステータス**: ✅ 全フェーズ完了
**実装所要時間**: Phase 1-6 完了
