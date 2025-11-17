# ローカル開発環境セットアップガイド

このガイドでは、GitHub Dashboard をローカル環境で開発するためのセットアップ手順を説明します。

---

## 🚀 クイック実行確認（既存環境の場合）

すでにセットアップが完了している場合は、以下の手順で実行確認ができます。

### 1. ビルド監視を開始（ターミナル1）

```bash
npm run build -- --watch
```

### 2. 開発サーバーを起動（ターミナル2）

```bash
wrangler pages dev dist --kv=SESSIONS --port=8788
```

### 3. ブラウザで確認

```
http://localhost:8788
```

**注意**: コード変更時は自動リビルドされますが、ブラウザのキャッシュクリア（Cmd+Shift+R）が必要な場合があります。

---

## 📋 前提条件

以下がインストールされていることを確認してください：

- **Node.js**: v18 以上
- **npm**: v9 以上
- **Git**: 最新版

---

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/GitHub_Dashboard.git
cd GitHub_Dashboard
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Wrangler CLI のインストール

Cloudflare Workers の開発ツールをグローバルにインストールします。

```bash
npm install -g wrangler
```

インストール後、バージョンを確認：

```bash
wrangler --version
```

### 4. Cloudflare にログイン

```bash
wrangler login
```

ブラウザが開き、Cloudflare アカウントでの認証が求められます。

### 5. GitHub OAuth App の作成

開発用の GitHub OAuth App を作成します。

1. GitHub Settings にアクセス: https://github.com/settings/developers
2. "OAuth Apps" → "New OAuth App" をクリック
3. 以下の情報を入力：
   - **Application name**: `GitHub Dashboard (Dev)`
   - **Homepage URL**: `http://localhost:8788`
   - **Authorization callback URL**: `http://localhost:8788/api/auth/callback`
4. "Register application" をクリック
5. **Client ID** をコピー
6. "Generate a new client secret" をクリックして **Client Secret** をコピー

### 6. 環境変数の設定

`.dev.vars.example` をコピーして `.dev.vars` を作成：

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を編集して、必要な値を設定：

```bash
# GitHub OAuth App の情報
GITHUB_CLIENT_ID=your_dev_client_id_here
GITHUB_CLIENT_SECRET=your_dev_client_secret_here

# セッション用のシークレット（以下のコマンドで生成）
SESSION_SECRET=your_random_32_char_string_here
ENCRYPTION_KEY=your_random_32_char_string_here
```

**シークレットの生成方法：**

```bash
# SESSION_SECRET を生成
openssl rand -hex 32

# ENCRYPTION_KEY を生成
openssl rand -hex 32
```

生成された値を `.dev.vars` にコピーしてください。`SESSION_SECRET` は現在の実装では未使用ですが、将来的な署名付き Cookie 対応のためにランダム文字列を設定しておきます。

### 7. KV バインディング（ローカル開発）

`wrangler pages dev` は `--kv=SESSIONS` のようにバインディング名を渡すと自動でローカル用 KV（インメモリ）を割り当てるため、追加設定は不要です。`wrangler.toml` に preview ID を書き込む必要もありません（本番のバインディングは Cloudflare Pages ダッシュボードで管理します）。

Cloudflare アカウント上の KV Namespace に対して動作確認をしたい場合のみ、以下を実行して preview namespace を作成し、得られた ID を `wrangler pages dev dist --kv=SESSIONS=<preview_id> ...` の形式で指定してください。

```bash
wrangler kv:namespace create SESSIONS --preview
```

---

## 🏃 開発サーバーの起動

ローカル開発には **2つのターミナル** が必要です。

### ターミナル1: Vite ビルド（Watch モード）

```bash
npm run build -- --watch
```

このコマンドは、ソースコードの変更を監視して自動的に再ビルドします。

### ターミナル2: Wrangler Pages 開発サーバー

```bash
wrangler pages dev dist --kv=SESSIONS --port=8788
```

このコマンドは、Cloudflare Workers Functions を含む完全な環境を起動します。

### ブラウザでアクセス

```
http://localhost:8788
```

---

## 🔧 開発ワークフロー

### コードの変更

1. `src/` ディレクトリ内のファイルを編集
2. ターミナル1 で自動的にリビルドされる
3. ブラウザをリロードして変更を確認

### Functions の変更

1. `functions/` ディレクトリ内のファイルを編集
2. ターミナル2 の Wrangler サーバーを再起動（Ctrl+C → 再度実行）
3. ブラウザをリロードして変更を確認

---

## 🧪 テストの実行

```bash
npm test
```

---

## 📦 ビルド

本番用ビルドを作成：

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに出力されます。

---

## 🐛 トラブルシューティング

### 問題: `wrangler pages dev` でエラーが発生する

**原因**: `dist/` ディレクトリが存在しない、または空

**解決策**:

```bash
npm run build
```

を実行してから、再度 `wrangler pages dev dist` を実行してください。

---

### 問題: OAuth callback が localhost に戻らない

**原因**: GitHub OAuth App の callback URL が正しく設定されていない

**解決策**:

GitHub OAuth App の設定を確認し、callback URL が以下と一致していることを確認：

```
http://localhost:8788/api/auth/callback
```

---

### 問題: セッションが保存されない

**原因**: KV Namespace が正しく設定されていない

**解決策**:

1. `wrangler kv:namespace create SESSIONS --preview` を実行
2. 出力された `preview_id` を `wrangler.toml` に設定
3. Wrangler サーバーを再起動

---

### 問題: 環境変数が読み込まれない

**原因**: `.dev.vars` ファイルが存在しない、または形式が間違っている

**解決策**:

1. `.dev.vars` ファイルが存在することを確認
2. ファイル形式が正しいか確認（`KEY=value` の形式、コメントなし）
3. Wrangler サーバーを再起動

---

### 問題: `GITHUB_CLIENT_ID` や `GITHUB_CLIENT_SECRET` が undefined

**原因**: `.dev.vars` の値が正しく設定されていない

**解決策**:

1. `.dev.vars` を開いて値を確認
2. 余分なスペースや引用符がないことを確認
3. GitHub OAuth App の設定から正しい値をコピー

---

### 問題: ビルド時に `terser` エラーが発生する

**原因**: `terser` パッケージがインストールされていない

**解決策**:

```bash
npm install --save-dev terser
```

---

## 📂 プロジェクト構造

```
GitHub_Dashboard/
├── src/                        # フロントエンドソースコード
│   ├── components/            # React コンポーネント
│   ├── contexts/              # React Context（認証など）
│   ├── api/                   # API クライアント
│   └── ...
├── functions/                  # Cloudflare Workers Functions
│   ├── api/
│   │   ├── auth/              # 認証エンドポイント
│   │   └── github/            # GitHub API プロキシ
│   ├── lib/                   # 共通ライブラリ
│   └── _middleware.ts         # グローバルミドルウェア
├── docs/                       # ドキュメント
├── dist/                       # ビルド成果物（生成される）
├── wrangler.toml              # Cloudflare Workers 設定
├── .dev.vars                  # ローカル環境変数（.gitignore済み）
└── package.json               # プロジェクト設定
```

---

## 🔗 関連ドキュメント

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Functions](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)

---

## 📝 Tips

### Hot Reload の効率化

Vite の watch モードと Wrangler の開発サーバーを組み合わせることで、効率的な開発が可能です。

### デバッグ

Wrangler の開発サーバーは、`console.log` を出力します。Functions のデバッグには積極的に活用してください。

### KV データの確認

ローカル環境の KV データは、Wrangler が自動的に管理します。リセットしたい場合は、サーバーを再起動してください。

---

**最終更新**: 2025-10-24
