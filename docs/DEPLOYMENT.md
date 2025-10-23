# Cloudflare Pages デプロイ手順書

このドキュメントでは、GitHub Dashboard を Cloudflare Pages にデプロイする詳細な手順を説明します。

---

## 📋 前提条件

以下の準備が完了していることを確認してください：

- [x] GitHub アカウント
- [x] Cloudflare アカウント（無料プランでOK）
- [x] Wrangler CLI がインストール済み（`npm install -g wrangler`）
- [x] プロジェクトが GitHub リポジトリにプッシュ済み

---

## 🚀 デプロイ手順

### ステップ1: GitHub OAuth App の作成（本番用）

1. **GitHub Settings にアクセス**

   https://github.com/settings/developers にアクセスします。

2. **新しい OAuth App を作成**

   - "OAuth Apps" タブをクリック
   - "New OAuth App" ボタンをクリック

3. **OAuth App の情報を入力**

   | 項目 | 値 |
   |------|-----|
   | Application name | `GitHub Dashboard` |
   | Homepage URL | `https://your-app-name.pages.dev` （後で更新） |
   | Authorization callback URL | `https://your-app-name.pages.dev/api/auth/callback` （後で更新） |
   | Application description | (任意) GitHub リポジトリをカンバンボードで管理 |

   **注意**: `your-app-name` は後で Cloudflare Pages で設定する実際のプロジェクト名に置き換えます。

4. **"Register application" をクリック**

5. **Client ID と Client Secret を取得**

   - **Client ID** をコピーして安全な場所にメモ
   - "Generate a new client secret" をクリック
   - **Client Secret** をコピーして安全な場所にメモ

   **重要**: Client Secret は一度しか表示されないため、必ず安全に保存してください。

---

### ステップ2: シークレットキーの生成

セッション管理と暗号化に使用するシークレットキーを生成します。

```bash
# SESSION_SECRET の生成
openssl rand -hex 32

# ENCRYPTION_KEY の生成
openssl rand -hex 32
```

生成された2つの値をメモしてください。後で Cloudflare Pages の環境変数に設定します。

---

### ステップ3: Cloudflare にログイン

```bash
wrangler login
```

ブラウザが開き、Cloudflare アカウントでの認証が求められます。認証を完了してください。

---

### ステップ4: KV Namespace の作成（本番用）

```bash
wrangler kv:namespace create SESSIONS
```

**出力例:**

```
🌀 Creating namespace with title "github-dashboard-SESSIONS"
✨ Success!
Add the following to your wrangler.toml:
kv_namespaces = [
  { binding = "SESSIONS", id = "abc123def456..." }
]
```

**重要**: 出力された `id` の値をメモしてください。

---

### ステップ5: `wrangler.toml` の更新

`wrangler.toml` の `env.production` セクションに、上記で取得した KV Namespace ID を設定します。

**編集前:**

```toml
[env.production]
kv_namespaces = [
  { binding = "SESSIONS", id = "YOUR_PRODUCTION_KV_NAMESPACE_ID" }
]
```

**編集後:**

```toml
[env.production]
kv_namespaces = [
  { binding = "SESSIONS", id = "abc123def456..." }  # 上で取得したIDを設定
]
```

変更をコミットしてプッシュします：

```bash
git add wrangler.toml
git commit -m "chore: Update production KV namespace ID"
git push
```

---

### ステップ6: Cloudflare Pages プロジェクトの作成

1. **Cloudflare Dashboard にアクセス**

   https://dash.cloudflare.com/ にログインします。

2. **Workers & Pages に移動**

   左サイドバーから "Workers & Pages" をクリックします。

3. **プロジェクトを作成**

   - "Create application" ボタンをクリック
   - "Pages" タブを選択
   - "Connect to Git" をクリック

4. **GitHub リポジトリを接続**

   - "GitHub" を選択
   - GitHub アカウントで認証
   - `GitHub_Dashboard` リポジトリを選択
   - "Begin setup" をクリック

5. **ビルド設定を入力**

   | 項目 | 値 |
   |------|-----|
   | Project name | `github-dashboard` （任意の名前） |
   | Production branch | `main` |
   | Framework preset | `None` または `Vite` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | (空欄) |

6. **"Save and Deploy" をクリック**

   初回デプロイが開始されます（環境変数を設定していないため、まだ動作しません）。

7. **デプロイ URL を確認**

   デプロイ完了後、以下のような URL が割り当てられます：

   ```
   https://github-dashboard.pages.dev
   ```

   この URL をメモしてください。

---

### ステップ7: KV Namespace のバインディング

1. **Settings → Functions に移動**

   プロジェクトページの上部タブから "Settings" をクリックし、左サイドバーから "Functions" を選択します。

2. **KV namespace bindings セクションまでスクロール**

3. **"Add binding" をクリック**

   | 項目 | 値 |
   |------|-----|
   | Variable name | `SESSIONS` |
   | KV namespace | `github-dashboard-SESSIONS` (ステップ4で作成したもの) |

4. **"Save" をクリック**

---

### ステップ8: 環境変数（Secrets）の設定

1. **Settings → Environment variables に移動**

2. **Production タブを選択**

3. **以下の環境変数を追加**

   "Add variable" をクリックして、以下を1つずつ追加します：

   | Variable name | Value | Type |
   |--------------|-------|------|
   | `GITHUB_CLIENT_ID` | (ステップ1で取得したClient ID) | Text |
   | `GITHUB_CLIENT_SECRET` | (ステップ1で取得したClient Secret) | Secret |
   | `SESSION_SECRET` | (ステップ2で生成した値) | Secret |
   | `ENCRYPTION_KEY` | (ステップ2で生成した値) | Secret |

   **"Secret" タイプの変数**:
   - "Encrypt" トグルを ON にしてください
   - 一度保存すると、値は表示されなくなります

4. **"Save" をクリック**

---

### ステップ9: GitHub OAuth App の Callback URL を更新

1. **GitHub OAuth App の設定ページに戻る**

   https://github.com/settings/developers にアクセスし、先ほど作成した OAuth App をクリックします。

2. **URL を更新**

   | 項目 | 更新後の値 |
   |------|-----------|
   | Homepage URL | `https://github-dashboard.pages.dev` (ステップ6で確認したURL) |
   | Authorization callback URL | `https://github-dashboard.pages.dev/api/auth/callback` |

3. **"Update application" をクリック**

---

### ステップ10: 再デプロイ

環境変数とKVバインディングを設定したので、再デプロイします。

**方法1: GitHubにプッシュ（自動デプロイ）**

```bash
# 何か変更をコミット（例: READMEの更新）
git add .
git commit -m "chore: Trigger redeployment"
git push
```

**方法2: Cloudflare Dashboard から再デプロイ**

1. Cloudflare Pages のプロジェクトページに移動
2. "Deployments" タブをクリック
3. 最新のデプロイの右側にある "..." メニューをクリック
4. "Retry deployment" を選択

---

### ステップ11: デプロイ確認

1. **ブラウザでアクセス**

   ```
   https://github-dashboard.pages.dev
   ```

2. **ログイン画面が表示されることを確認**

3. **"Login with GitHub" をクリック**

4. **GitHub OAuth 認証画面が表示されることを確認**

   - アプリケーション名: "GitHub Dashboard"
   - アクセス権限: "Repositories" と "Personal user data"

5. **"Authorize" をクリック**

6. **ダッシュボードにリダイレクトされることを確認**

7. **リポジトリが表示されることを確認**

   - プライベートリポジトリも表示されるはず
   - 4列に正しく分類されているか確認

8. **各機能が動作することを確認**

   - 検索
   - 並び替え
   - 保存ビュー
   - ログアウト

---

## 🔧 カスタムドメインの設定（オプション）

独自ドメインを使用したい場合は、以下の手順で設定できます。

### 前提条件

- 独自ドメインを所有している（例: `example.com`）

### 手順

1. **Cloudflare Pages のプロジェクトページに移動**

2. **"Custom domains" タブをクリック**

3. **"Set up a custom domain" をクリック**

4. **ドメイン名を入力**

   例: `dashboard.example.com`

5. **DNS レコードを追加**

   Cloudflare がDNS設定を案内します。ドメインがCloudflareで管理されている場合は自動設定されます。

6. **SSL証明書が自動的に発行されるまで待つ**

   通常、数分〜数時間で完了します。

7. **GitHub OAuth App の URL を更新**

   - Homepage URL: `https://dashboard.example.com`
   - Authorization callback URL: `https://dashboard.example.com/api/auth/callback`

---

## 📊 デプロイ後のモニタリング

### ビルドログの確認

1. Cloudflare Pages のプロジェクトページ
2. "Deployments" タブ
3. 各デプロイをクリックして詳細を確認

### Functions ログの確認

1. Cloudflare Pages のプロジェクトページ
2. "Functions" タブ
3. リアルタイムログを確認

### KV データの確認

```bash
# KV のキー一覧を取得
wrangler kv:key list --namespace-id=abc123def456...

# 特定のキーの値を取得
wrangler kv:key get "session:xxx" --namespace-id=abc123def456...
```

---

## 🐛 トラブルシューティング

### 問題: ログインしても401エラーが発生する

**原因**: 環境変数が正しく設定されていない、またはKVバインディングが設定されていない

**解決策**:

1. Cloudflare Pages の Settings → Environment variables を確認
2. `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY` が設定されているか確認
3. Settings → Functions → KV namespace bindings を確認
4. `SESSIONS` バインディングが正しく設定されているか確認
5. 再デプロイ

---

### 問題: OAuth callback エラーが発生する

**原因**: GitHub OAuth App の callback URL が正しくない

**解決策**:

1. GitHub OAuth App の設定を確認
2. Authorization callback URL が `https://your-app-name.pages.dev/api/auth/callback` と一致しているか確認
3. HTTPS であることを確認（HTTP は不可）

---

### 問題: プライベートリポジトリが表示されない

**原因**: OAuth スコープに `repo` が含まれていない

**解決策**:

1. `functions/api/auth/login.ts` を確認
2. `scope` パラメータに `repo read:user` が含まれているか確認
3. コードを修正してデプロイ
4. 一度ログアウトして再度ログイン

---

### 問題: ビルドが失敗する

**原因**: 依存関係の問題、またはビルドコマンドの誤り

**解決策**:

1. Cloudflare Pages の Deployments ログを確認
2. ローカルで `npm run build` が成功することを確認
3. `package.json` の dependencies と devDependencies を確認
4. Node.js のバージョンを確認（Cloudflare Pages は Node 18 以降を推奨）

---

### 問題: Functions が動作しない

**原因**: `functions/` ディレクトリが正しくデプロイされていない

**解決策**:

1. プロジェクトルートに `functions/` ディレクトリが存在するか確認
2. GitHub リポジトリに `functions/` がプッシュされているか確認
3. Cloudflare Pages の "Functions" タブでログを確認
4. 再デプロイ

---

## 🔄 継続的デプロイ（CI/CD）

Cloudflare Pages は、GitHub との連携により、自動的に継続的デプロイが設定されます：

- **main ブランチへのプッシュ**: 本番環境に自動デプロイ
- **Pull Request の作成**: プレビュー環境が自動生成

### プレビューデプロイ

Pull Request を作成すると、以下のようなプレビュー URL が自動生成されます：

```
https://abc123.github-dashboard.pages.dev
```

プレビュー環境では、本番環境と同じ環境変数とKVバインディングが使用されます。

---

## 📈 パフォーマンス最適化

### キャッシュ戦略

Cloudflare Pages は、静的アセットを自動的にキャッシュします：

- HTML: キャッシュなし
- CSS/JS: 長期キャッシュ（ハッシュベースのファイル名）
- 画像: 長期キャッシュ

### CDN

Cloudflare のグローバル CDN により、世界中のユーザーに高速にコンテンツを配信します。

---

## 🔒 セキュリティのベストプラクティス

### 環境変数の管理

- **絶対に** Secrets をコードにハードコーディングしない
- Cloudflare Pages の "Secret" タイプを使用する
- 定期的にシークレットをローテーション

### OAuth App の管理

- Client Secret を安全に保管
- 不要になったトークンは revoke
- OAuth App の権限を最小限に設定

### KV データの管理

- 定期的に古いセッションを削除（TTLで自動削除される）
- KV Namespace へのアクセスを制限

---

## 📚 参考リンク

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Functions](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

## ✅ デプロイチェックリスト

デプロイ完了前に、以下をすべて確認してください：

- [ ] GitHub OAuth App（本番用）を作成
- [ ] シークレットキー（SESSION_SECRET, ENCRYPTION_KEY）を生成
- [ ] Cloudflare にログイン
- [ ] 本番用 KV Namespace を作成
- [ ] `wrangler.toml` に KV Namespace ID を設定
- [ ] Cloudflare Pages プロジェクトを作成
- [ ] ビルド設定が正しい（`npm run build` / `dist`）
- [ ] KV Namespace バインディングを設定
- [ ] 環境変数（4つ）を設定
- [ ] GitHub OAuth App の callback URL を更新
- [ ] 再デプロイを実行
- [ ] ログイン機能をテスト
- [ ] リポジトリ表示をテスト
- [ ] 各機能（検索、並び替え、保存ビュー）をテスト
- [ ] プライベートリポジトリが表示されることを確認

---

**最終更新**: 2025-10-24
