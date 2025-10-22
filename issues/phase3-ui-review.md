# フェーズ3 コードレビュー課題

## Issue: Tauri 版でリンクが開けない
- **現象**: `RepoCard` のカードクリック時に `window.open` を実行しているが、Tauri の WebView では外部ブラウザを起動できずに失敗する。
- **影響**: 要件である「カードクリックで `htmlUrl` を開く」動作がデスクトップアプリで満たせない。
- **対応案**:
  - Tauri 実行環境では `@tauri-apps/api/shell` の `open` 関数を利用する。
  - ブラウザと Tauri で挙動を分岐させるため、`if (typeof window !== 'undefined')` などで環境判定を行う。
  - 共通フックやユーティリティを用意して、モバイル／デスクトップ双方で期待どおりリンクを開けるようにする。

## Issue: `line-clamp-2` が機能していない
- **現象**: Tailwind CSS の `line-clamp-2` クラスを使用しているが、`tailwind.config.js` に `@tailwindcss/line-clamp` プラグインが追加されていないためクラスが生成されていない。
- **影響**: 説明文が 2 行で切り詰められず、長文のリポジトリカードでレイアウト崩れを引き起こす可能性がある。
- **対応案**:
  - `tailwind.config.js` に `require('@tailwindcss/line-clamp')` を追加し、ビルドに反映させる。
  - もしくは CSS で独自のクランプスタイルを定義するなど、説明文を 2 行に制限する別手段を導入する。
