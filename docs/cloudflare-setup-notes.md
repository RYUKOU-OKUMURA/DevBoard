# Cloudflare Pages セットアップで詰まったポイントまとめ

Cloudflare Pages で GitHub Dashboard を公開する際にハマった問題と、その解決方法を整理したメモです。今後同じ状況になったときのリファレンスとして使えます。

## 1. ダッシュボードでバインディングを編集できない
- 症状: Pages の Settings → Functions → Bindings がグレーアウトし、「このプロジェクトのバインディングは wrangler.toml を通じて管理されています」と表示される。
- 原因: Build system で「Use a Wrangler configuration file (BETA)」がオンになっていた。
- 対処: Settings → Build system で該当トグルをオフにし、再読み込み後に UI から編集する。`wrangler.toml` 自体はリポジトリに残して問題なし。

## 2. KV バインディングの変数名ミス
- 症状: Functions から `env.SESSIONS` が参照できない。
- 原因: KV バインディングの Variable name を `github-dashboard` など別名で登録していた。
- 対処: Settings → Functions → KV bindings で Variable name を `SESSIONS` に変更。保存すると次のデプロイで反映される。

## 3. `/api/auth/status` の使い方
- 症状: 404 になる、あるいは GitHub の 404 ページに飛ぶ。
- 原因: `https://<ドメイン>/api/auth/status` の `<ドメイン>` をそのまま開いてしまった。
- 対処: 実際のデプロイドメイン（例: `https://github-dashboard-291.pages.dev`）を指定してアクセスする。ここで `kvOk` や Secrets の状態を確認できる。

## 4. GitHub OAuth 用シークレットの未設定
- 症状: `/api/auth/status` が `ok: false` で `hasClientId` などが `false`。
- 対処: Cloudflare Pages → Settings → Environment variables（Secret）に次を追加。
  - `GITHUB_CLIENT_ID`: GitHub OAuth App の Client ID。
  - `GITHUB_CLIENT_SECRET`: GitHub OAuth App で生成した Client Secret。
  - `ENCRYPTION_KEY`: ローカルで `openssl rand -hex 32` を実行して得たランダムな 32 バイトの Hex 文字列。

## 5. GitHub OAuth のリダイレクト URI 不一致
- 症状: GitHub で「Be careful! The redirect_uri is not associated with this application」と表示される。
- 原因: GitHub OAuth App に登録した Authorization callback URL と、実際にアプリが利用する URL が一致していない。
- 対処: `/api/auth/status` の `expectedCallback` を確認し、その値（例: `https://github-dashboard-291.pages.dev/api/auth/callback`）を GitHub OAuth App に登録する。末尾のスラッシュやドメインの差異に注意。

## 6. 「Failed to fetch user information」エラー
- 症状: OAuth 認可までは成功するが、コールバック後にテキストで「Failed to fetch user information」と表示される。
- 原因: GitHub の `https://api.github.com/user` API に `User-Agent` ヘッダーを付けていなかった。
- 対処: `functions/api/auth/callback.ts` の GitHub API リクエストに `User-Agent` ヘッダーを追加し再デプロイ。現在は `github-dashboard-app` を設定済み。

## 7. 最終確認
- `/api/auth/status` が `ok: true` になることを確認。
- `https://<デプロイドメイン>/api/auth/login` から OAuth フローを実行すると、GitHub 認証後にダッシュボードのトップへリダイレクトされる。
- カスタムドメインへ移行する場合は、`PUBLIC_ORIGIN` を設定し、GitHub OAuth App の callback URL も同じドメインに合わせる。

以上を踏まえれば、Cloudflare Pages 上で GitHub Dashboard を安定して運用できる。
