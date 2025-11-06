---
name: ローカルストレージが使われない問題
about: ローカルストレージのキャッシュ機能が正しく動作しない
title: "[BUG] ローカルストレージのキャッシュが使用されない"
labels: bug, performance
assignees: ''

---

## 問題の概要
ローカルストレージにキャッシュされたリポジトリデータが使用されず、毎回APIリクエストが送信されている可能性がある。

## 期待される動作
1. 初回アクセス時はAPIからデータを取得し、ローカルストレージに保存（タイムスタンプ付き）
2. 2回目以降のアクセス時は、キャッシュが有効（2分以内）であればローカルストレージからデータを取得
3. リフレッシュボタンをクリックした場合のみ、明示的にAPIから再取得
4. レート制限に達した場合は、キャッシュデータを使用

## 実際の動作
- [ ] 毎回APIリクエストが送信されている
- [ ] ローカルストレージにデータが保存されていない
- [ ] ローカルストレージにデータはあるが、読み込まれていない
- [ ] キャッシュのTTL（2分）が正しく機能していない

## 再現手順
1. ログインしてリポジトリを読み込む
2. 開発者ツールのネットワークタブを開く
3. ページをリロードする
4. `/api/github/graphql/repos/viewer` へのリクエストが送信されるか確認
5. ローカルストレージ（Application > Local Storage）を確認
   - `devboard_viewer_repos` キーが存在するか
   - `timestamp` フィールドが正しく設定されているか

## 確認すべきポイント

### クライアント側 (src/api/repos.ts)
- [ ] `fetchAllRepositories()` が `loadViewerRepos()` を呼び出しているか
- [ ] `forceRefresh=false` の場合、キャッシュチェックが実行されているか
- [ ] キャッシュが見つかった場合、早期リターンしているか
- [ ] API取得後に `saveViewerRepos()` が呼び出されているか

### ローカルストレージユーティリティ (src/utils/repoStorage.ts)
- [ ] `loadViewerRepos()` がデータを正しく取得できているか
- [ ] TTL（2分 = 120000ms）の計算が正しいか
- [ ] `saveViewerRepos()` がデータを正しく保存できているか
- [ ] タイムスタンプが `Date.now()` で正しく生成されているか

### App.tsx
- [ ] `loadRepos()` が `forceRefresh` パラメータを正しく渡しているか
- [ ] 初回ロード時に `forceRefresh=false` になっているか
- [ ] リフレッシュボタンクリック時に `forceRefresh=true` になっているか

## 環境
- ブラウザ: [例: Chrome 120.0.0.0]
- OS: [例: macOS 14.0]
- デプロイ環境: [例: Cloudflare Pages / ローカル開発]

## デバッグログ
ブラウザのコンソールに表示されるログを貼り付けてください：
```
例:
Using cached viewer repositories (25 repos)
または
Fetched 25 repositories
```

## スクリーンショット
必要に応じて、ローカルストレージの状態やネットワークリクエストのスクリーンショットを添付してください。

## 追加情報
- レート制限機能: 1分間に3回までのAPIリクエスト制限
- キャッシュTTL: 2分間
- 関連する実装:
  - [src/api/repos.ts:107-119](../../../src/api/repos.ts#L107-L119) - キャッシュチェック
  - [src/utils/repoStorage.ts](../../../src/utils/repoStorage.ts) - ストレージユーティリティ
  - [src/utils/rateLimiter.ts](../../../src/utils/rateLimiter.ts) - レート制限

## 対応案
1. コンソールログを追加して、キャッシュの読み込み/保存が正しく動作しているか確認
2. `localStorage.getItem()` と `localStorage.setItem()` の呼び出しをデバッグ
3. ブラウザのプライベートモードやシークレットモードでの動作確認
4. ローカルストレージの容量制限に達していないか確認
