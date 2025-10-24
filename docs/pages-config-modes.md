# Cloudflare Pages の構成モードと「設定できない」場合の対処

このリポジトリを Cloudflare Pages に接続すると、プロジェクトの設定画面で「このプロジェクトのバインディングは wrangler.toml を通じて管理されています」という表示になり、ダッシュボード上で変数やバインディングを編集できなくなる場合があります。

これは、Pages プロジェクトが「Wrangler 設定ファイル（BETA）」を使用するモードになっているためです。以下の 2 つの運用モードのどちらかを選び、手順に従ってください。

---

## モードA: ダッシュボード管理（推奨）
Cloudflare Pages の UI から Variables/Bindings を編集する一般的なモードです。

- 想定ユーザー: UI で設定したい、シークレットをレポジトリに書きたくない
- メリット: セキュアでわかりやすい。チーム運用もしやすい
- デメリット: なし（本プロジェクトはこの前提で設計）

手順:
1. Cloudflare Pages ダッシュボード → 対象プロジェクト → Settings → Build system
2. 「Use a Wrangler configuration file (BETA)」をオフにする（無効化）
3. Settings → Functions → KV bindings: 既存の KV Namespace を Variable name「SESSIONS」でバインド
4. Settings → Environment variables（Secrets）に以下を追加:
   - GITHUB_CLIENT_ID
   - GITHUB_CLIENT_SECRET
   - ENCRYPTION_KEY（`openssl rand -hex 32` で生成）
   - 任意: PUBLIC_ORIGIN（本番ドメインを固定したい場合）
5. GitHub OAuth App の Authorization callback URL を `https://<本番ドメイン>/api/auth/callback` に設定
6. `https://<本番ドメイン>/api/auth/status` を開き、`ok=true` になることを確認

---

## モードB: Wrangler 管理（上級者向け）
`wrangler.toml` にバインディング/変数を定義して管理します。Pages の設定画面はロックされます。

- 想定ユーザー: IaC 的にすべてコードで管理したい
- メリット: すべてをコードで一元管理できる
- デメリット: Secrets をレポジトリに置かない工夫が必要、運用がやや難しい

手順（概要）:
1. Pages の Settings → Build system で「Use a Wrangler configuration file (BETA)」をオンのままにする
2. `wrangler.toml` に以下のような項目を追加（例）
   ```toml
   # 注意: 値はダミー。実運用では CI の環境変数や機密管理から注入すること
   compatibility_date = "2024-01-01"

   [vars]
   PUBLIC_ORIGIN = "https://example.com" # 任意
   # GITHUB_CLIENT_ID / SECRET / ENCRYPTION_KEY は直接ハードコードせず、
   # デプロイ時に wrangler CLI の `--var` や Pages の Secrets から注入すること

   [[kv_namespaces]]
   binding = "SESSIONS"
   id = "<your_kv_namespace_id>"     # 本番
   preview_id = "<your_preview_id>"  # プレビュー
   ```
3. シークレットはレポジトリに書かず、以下のいずれかで注入
   - Cloudflare Pages の Environment variables（UI）
   - wrangler の `--var` や GitHub Actions などの CI から注入
4. デプロイ後、`/api/auth/status` を確認

注意:
- Pages の CI では一部のリソース ID が無視されることがあり、Beta 仕様は変更される可能性があります。安定運用にはモードAを推奨します。

---

## どちらのモードでも共通の確認方法
- `https://<あなたのドメイン>/api/auth/status` で準備状況を確認（`ok=true` で準備完了）
- その後、`/api/auth/login` → `/api/auth/callback` のフローでサインインを確認

## よくある質問
- 設定画面がグレーアウトして編集できない → モードB（Wrangler 管理）になっています。モードAにしたい場合は Build system で BETA オプションをオフにしてください。
- どのドメインを callback に設定すればよい？ → `/api/auth/status` の `expectedCallback` を GitHub OAuth App に登録してください。
