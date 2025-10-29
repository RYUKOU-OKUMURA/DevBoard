# 🟠 認証・認可不備 - esbuildの脆弱性による開発サーバーへの不正アクセス

## メタデータ
```yaml
id: vuln-001
version: v1
iteration: 1
language: js
category: auth
cwe_id: CWE-918
cvss_score: 6.1
severity: Medium
priority: P1
discovered: 2025-10-29
status: New
related_vulns: []
```

## 🎯 要約
プロジェクトが依存する `esbuild` の脆弱性 (GHSA-67mh-4wv8-2f99) により、開発サーバーが任意のウェブサイトからのリクエストを受け付け、そのレスポンスを読み取られてしまう可能性があります。

## 📍 発生場所
- **ファイル**: `package-lock.json`
- **依存関係**: `esbuild` (vite経由)

## 💣 詳細

### 問題コード
```json
// package-lock.json の一部
"node_modules/vite": {
  "version": "...",
  "dependencies": {
    "esbuild": "..." // 脆弱なバージョン
  },
  ...
}
```

### 根本原因
- `vite` パッケージが、脆弱性 (GHSA-67mh-4wv8-2f99) を含む `esbuild` のバージョンに依存しています。
- この脆弱性により、`esbuild` の開発サーバーは、リクエストのオリジンを適切に検証せず、クロスサイトのリクエストを受け入れてしまいます。

### 攻撃シナリオ
1. 開発者が脆弱な `esbuild` を使用する開発サーバーを起動します。
2. 攻撃者は、開発者を悪意のあるウェブサイトに誘導します。
3. そのウェブサイトに埋め込まれたスクリプトが、開発者のローカルで実行されている開発サーバー (`localhost`) に対してリクエストを送信します。
4. 開発サーバーはリクエストを処理し、レスポンスを返します。これにより、ローカルファイルやAPIのレスポンスなどの機密情報が攻撃者に漏洩する可能性があります。

### 影響範囲
- **機密性**: High (ローカルでアクセス可能な任意の情報が漏洩する可能性がある)
- **完全性**: Low
- **可用性**: Low
- **影響ユーザー**: 開発者

## 🔬 検証手順 (PoC)
`npm audit` の結果で脆弱性が示されています。

```bash
# npm audit report
esbuild  <=0.24.2
Severity: moderate
esbuild enables any website to send any requests to the development server and read the response - https://github.com/advisories/GHSA-67mh-4wv8-2f99
...
```

## 🛡️ 推奨対策

### 短期
- [ ] `npm audit fix --force` を実行して、依存関係を更新する。
  - **注意**: これにより `vite` のメジャーバージョンが更新される可能性があり、互換性の問題が発生するリスクがあります。実行前に変更内容を確認してください。

### 長期
- [ ] 定期的に `npm audit` を実行し、依存関係の脆弱性を監視するプロセスを導入する。

## 🔗 参考
- GitHub Advisory: https://github.com/advisories/GHSA-67mh-4wv8-2f99
- CWE-918: Server-Side Request Forgery (SSRF): https://cwe.mitre.org/data/definitions/918.html
