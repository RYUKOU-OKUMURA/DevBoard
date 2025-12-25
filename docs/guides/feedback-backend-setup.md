# フィードバック送信バックエンド設定ガイド

このガイドは、公開フォームのフィードバックを安全に受け取るために
Cloudflare Pages Functions + Turnstile + Google Sheets API を使う構成の
バックエンド設定手順をまとめたものです。

## 構成概要

- フロントエンド: `/api/feedback` へ POST
- Cloudflare Pages Functions: バリデーション + Turnstile 検証 + レート制限
- 保存先: Google Sheets API（サービスアカウントで書き込み）

## 前提

- Cloudflare Pages にデプロイ済み
- Google アカウントがある
- スプレッドシートを作成済み

## 1. スプレッドシート準備

1. Google Sheets を作成
2. シート名を決める（例: `Feedback`）
3. ヘッダー行を追加（例）
   - `timestamp`
   - `category`
   - `content`
   - `email`
   - `userAgent`
   - `ip`（任意）

## 2. Google Cloud プロジェクトと Sheets API

1. Google Cloud Console で新規プロジェクト作成
2. 「Google Sheets API」を有効化
3. サービスアカウントを作成
4. サービスアカウントのキーを発行（JSON）
5. スプレッドシートをサービスアカウントのメールアドレスに共有（編集権限）

## 3. Turnstile セットアップ

1. Cloudflare Dashboard → Turnstile
2. サイトを作成
3. `Site Key` と `Secret Key` を控える

## 4. 環境変数（Cloudflare Pages）

Cloudflare Pages の Environment Variables（Preview/Production 両方）に追加:

- `TURNSTILE_SECRET`
- `FEEDBACK_SHEET_ID`（スプレッドシートID）
- `FEEDBACK_SHEET_NAME`（例: `Feedback`）
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PROJECT_ID`

注意:
- `GOOGLE_PRIVATE_KEY` は改行を `\n` に置換した値を登録し、
  コード側で `\\n` → `\n` に戻す。

## 5. ローカル開発用の環境変数

`.dev.vars` に同様の値を設定します（例）:

```bash
TURNSTILE_SECRET=your_turnstile_secret_here
FEEDBACK_SHEET_ID=your_sheet_id_here
FEEDBACK_SHEET_NAME=Feedback
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_PROJECT_ID=your-google-project-id
```

## 6. API 仕様（想定）

### リクエスト

`POST /api/feedback`

```json
{
  "category": "bug" | "feature" | "other",
  "content": "10〜2000文字",
  "email": "optional@email.com",
  "timestamp": "ISO8601",
  "userAgent": "UA文字列",
  "turnstileToken": "Turnstile token"
}
```

### レスポンス（成功）

```json
{
  "success": true
}
```

### レスポンス（エラー例）

```json
{
  "success": false,
  "message": "validation failed"
}
```

## 7. 実装のポイント

- `functions/api/feedback.ts` を作成して POST を受ける
- Turnstile 検証は `siteverify` を `application/x-www-form-urlencoded` で送信
- Google Sheets API は `spreadsheets.values.append` を使用
- 既存の `_middleware.ts` で IP レート制限が有効
- CORS は `ALLOWED_ORIGINS` が有効。運用ドメインを設定する

## 8. 運用チェックリスト

- [ ] Turnstile secret の漏えいがない
- [ ] サービスアカウントキーを定期的にローテーション
- [ ] Sheets の書き込み権限は最小限
- [ ] レート制限を想定通り動作確認

