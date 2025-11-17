# セキュリティ概要レポート

## 1. ドキュメント目的
本書は GitHub Dashboard の現状のセキュリティ実装、運用要件、既知の改善事項を整理し、全体のセキュリティレベルを 10 段階で評価したものです。クラウドフレア環境での運用を前提とした技術的・組織的対策の理解共有を目的とします。

## 2. システム構成とトラストバウンダリ
- **ホスティング**: Cloudflare Pages にデプロイされた React/Vite フロントエンド。【F:README.md†L8-L34】
- **バックエンド**: Cloudflare Workers Functions が API および OAuth フローを提供し、Workers KV を利用してセッション情報を管理。【F:README.md†L20-L60】【F:functions/lib/session.ts†L1-L204】
- **外部依存**: GitHub OAuth Apps と GitHub GraphQL/REST API をアクセストークン経由で呼び出す。【F:README.md†L36-L46】
- **秘匿情報の保管**: アクセストークンはサーバーサイド（Workers KV）に AES-256-GCM で暗号化して保存し、フロントエンドへは露出しない。【F:README.md†L48-L64】【F:docs/misc/PRIVACY.md†L47-L88】【F:functions/lib/session.ts†L49-L129】

## 3. 現行のセキュリティ対策
### 3.1 認証とセッション管理
- GitHub OAuth フローでユーザーを認証し、セッションは UUID ベースの masterSessionId とマルチアカウントメタデータで管理。【F:docs/コードレビューとセキュリティチェック.md†L4-L75】【F:functions/lib/session.ts†L1-L204】
- セッション Cookie `session_id` は `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30days` で設定され、値は HMAC-SHA-256 署名付きトークンとして保存される。【F:docs/misc/PRIVACY.md†L89-L123】【F:functions/lib/session.ts†L136-L213】
- 全アカウントからのログアウト時は master セッションと個別セッションを KV から削除し、Cookie を失効させる設計。【F:docs/コードレビューとセキュリティチェック.md†L10-L74】【F:functions/lib/session.ts†L214-L400】

### 3.2 データ保護
- アクセストークンは AES-256-GCM で暗号化し、IV を含むバイナリを Base64 化して保存。鍵素材は 32 バイト（64 hex 文字）で想定。【F:README.md†L48-L64】【F:functions/lib/crypto.ts†L1-L80】
- セッションデータは KV に TTL 30 日で格納され、期限切れで自動削除。【F:functions/lib/session.ts†L1-L90】

### 3.3 通信・ヘッダ対策
- グローバルミドルウェアで `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection` を付与し、CORS プリフライトを処理。【F:functions/_middleware.ts†L1-L39】
- Cookie は HTTPS 前提 (`Secure`) で発行され、CSRF 緩和として `SameSite=Lax` を採用。【F:docs/misc/PRIVACY.md†L89-L123】

### 3.4 クライアント側保護
- 保存ビューやカスタムリポジトリはブラウザのローカルストレージに保存されるが、アクセストークンなど機密値はクライアントへ提供されない。【F:docs/misc/PRIVACY.md†L24-L63】
- UI 上での危険操作（全アカウントログアウト）は視覚的に分離され、多重送信防止などの改善提案が残課題として整理されている。【F:docs/コードレビューとセキュリティチェック.md†L16-L69】

## 4. 運用・設定要件
- `.dev.vars` と本番環境には `GITHUB_CLIENT_ID/SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY` を設定する必要がある。【F:README.md†L66-L111】
- `SESSION_SECRET` はセッション署名用の 32 バイト相当の hex 文字列を想定し、`ENCRYPTION_KEY` は 32 バイト（64 hex 文字）を要求する運用ルール。ただし現実装では鍵長バリデーションが不足しているため手動チェックが必要。【F:README.md†L66-L111】【F:functions/lib/crypto.ts†L1-L80】【F:docs/コードレビューとセキュリティチェック.md†L132-L170】
- KV バインディング `SESSIONS` を Cloudflare Pages/Workers で設定し、本番では ID をコードベースに記載しない方針。【F:README.md†L98-L120】

## 5. 既知のリスクと改善提案
- **CSRF 強化**: `SameSite=Lax` のみで、POST エンドポイントに Origin/Referer 検証や二重送信トークンが未実装。【F:docs/コードレビューとセキュリティチェック.md†L92-L156】
- **レスポンスキャッシュ制御**: 認証関連レスポンスで `Cache-Control: no-store` を一貫して返していない可能性がある。【F:docs/コードレビューとセキュリティチェック.md†L76-L131】
- **GitHub プロキシ硬化**: `[[path]].ts` の許可リスト化やメソッド制限、Content-Type 検証が未対応。【F:docs/コードレビューとセキュリティチェック.md†L132-L188】
- **暗号鍵バリデーション**: `ENCRYPTION_KEY` 長さチェックが実装されておらず、誤設定時に暗号処理が失敗するリスク。【F:functions/lib/crypto.ts†L1-L80】【F:docs/コードレビューとセキュリティチェック.md†L132-L170】
- **監査ログ/通知**: 失敗時のユーザー通知やセキュリティイベントの監査ログが未整備。【F:docs/コードレビューとセキュリティチェック.md†L60-L120】

## 6. 運用フローと要件の整理
1. **OAuth アプリ管理**: GitHub 側でリダイレクト URL を本番/開発に合わせて設定し、不要なトークンは revoke 可能にする。【F:README.md†L82-L134】【F:docs/misc/PRIVACY.md†L137-L191】
2. **セッションライフサイクル**: ログイン時にセッション保存、最大 5 アカウントまで切り替え可能。ログアウト時に KV を掃除し Cookie 失効。【F:functions/lib/session.ts†L214-L400】
3. **データ保持**: KV のセッション TTL は 30 日、ローカルストレージデータはユーザー削除まで保持するためポリシー上の通知が必要。【F:docs/misc/PRIVACY.md†L89-L168】
4. **インシデント対応**: 監査ログが未整備のため、Workers のログ出力と Cloudflare Analytics を併用して暫定対応。将来的に Sentry 等の統合が推奨。【F:docs/コードレビューとセキュリティチェック.md†L60-L120】

## 7. セキュリティレベル評価
- **総合評価**: 10 段階中 **7/10**。
- **根拠**:
  - 強み: トークン暗号化、HMAC 付きセッション Cookie、KV TTL、最低限のセキュリティヘッダが実装済み。【F:functions/lib/session.ts†L1-L213】【F:functions/lib/crypto.ts†L1-L80】【F:functions/_middleware.ts†L1-L39】
  - 課題: CSRF 対策がヘッダ検証まで至っていない点、鍵バリデーションやキャッシュ制御の不足、API の許可リスト化など攻撃面の縮小余地が残る。【F:docs/コードレビューとセキュリティチェック.md†L92-L188】
  - 今後の改善を実施すれば 8〜9/10 への引き上げが期待できる。

## 8. 今後のアクションアイテム
- 全ミューテーションエンドポイントで Origin/Referer チェックを強制する共通ミドルウェアを実装。
- `encryptToken` 呼び出し時に `ENCRYPTION_KEY` の長さ検証を追加し、環境変数未設定時は起動時にフェイルファスト。
- GitHub プロキシをメソッド/パス許可リスト方式へ変更し、`Cache-Control: no-store` を統一適用。
- ログアウト等の API 応答で失敗時も Cookie を失効させ、ユーザー通知（Toast など）と監査ログを追加。

以上。
