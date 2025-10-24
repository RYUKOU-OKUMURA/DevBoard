# 詳しい結果（ログと診断の見方）

このプロジェクトの「詳しい結果」は、主に以下の 3 つの場所で確認できます。

1) Cloudflare Pages のビルド/デプロイログ（CI）
- Cloudflare Pages ダッシュボード → 対象プロジェクト → Deployments
- 各デプロイのビルドログ、アセット公開、Functions のコンパイル状況が表示されます。
- wrangler.toml の `pages_build_output_dir = "dist"` が使用されます。

2) Cloudflare Pages Functions（実行時）ログ
- Cloudflare Pages ダッシュボード → 対象プロジェクト → Functions → Logs
- /api/auth/* および /api/github/* の実行結果や `console.error(...)` の内容を確認できます。
- 認証関連で見るべきパス：
  - GET /api/auth/login
  - GET /api/auth/callback
  - GET /api/auth/me
  - POST/GET /api/auth/logout

3) アプリ内の診断エンドポイント（本リポジトリに追加）
- GET /api/auth/status
  - 現在の環境がログイン可能な状態かを「安全なブール値」で返します（シークレットは出力しません）。
  - 返される主なフィールド：
    - ok: すべて整っていれば true
    - environment.hasClientId / hasClientSecret / hasEncryptionKey
    - environment.kvOk（KV への put/get/delete の簡易健康チェック）
    - environment.computed.effectiveOrigin / expectedCallback
  - 対応すべき事項が残っている場合は guidance に次の手順が出ます。


トラブルシューティング手順（サインインできない場合）
- 1. /api/auth/status を開く
  - ok=false の場合、どのフラグが false かを確認します。
  - hasClientId/hasClientSecret/hasEncryptionKey が false → Cloudflare Pages の Environment variables（Secrets）に設定してください。
  - kvOk=false → Functions → KV bindings で KV Namespace を Variable name「SESSIONS」でバインドしてください。
- 2. GitHub OAuth App の設定を確認
  - Authorization callback URL が /api/auth/status の `expectedCallback` と完全一致している必要があります。
- 3. ドメインの混在を解消
  - ログイン開始～ダッシュボード表示まで同一ドメインでアクセスしてください（pages.dev とカスタムドメインの混在を避ける）。
- 4. ブラウザの開発者ツールでネットワークを確認
  - /api/auth/callback のレスポンスヘッダーに Set-Cookie: session_id=... が付与されているかを確認。
  - その後の /api/auth/me が 200 になることを確認。
- 5. Functions Logs を確認
  - Token exchange / User fetch 失敗時のエラーメッセージが `console.error` 経由で出力されます。


補足（PUBLIC_ORIGIN の利用）
- 本番ドメインを固定したい場合は Cloudflare Pages の環境変数に PUBLIC_ORIGIN（例: https://example.com）を設定してください。
- /api/auth/status にも publicOriginConfigured=true として反映され、expectedCallback がそのドメインベースで計算されます。
