# コードレビュー＆最小リファクタ リポート（2025-10-23 / Junie）

本ドキュメントは GitHub_Dashboard プロジェクトの現状コードに対するレビュー結果と、本セッションで実施した最小限のリファクタリング内容を日本語でまとめたものです。

## サマリー
- 良い点
  - 型定義（src/types）が整理されており、Repo や表示に必要な型が簡潔。
  - 検索・並び替え・分類などの関心ごとが utils / lib / components に分離され、見通しが良い。
  - コンポーネント分割（RepoBoard / RepoColumn / RepoCard）の方向性は妥当で、Tailwind のユーティリティクラスも一貫。
- 改善余地（重要度が高い順）
  1) 分類ロジックが重複実装：
     - src/utils/classify.ts と src/lib/classifyRepo.ts に「分類」ロジックがそれぞれ存在し、仕様も微妙に異なる（閾値、基準日時、丸め処理等）。
  2) アクセシビリティ（A11y）：
     - クリック可能なカードに role/tabIndex/Enter/Space 対応が必要。
  3) 外部リンクの安全な遷移：
     - window.open 失敗（ポップアップブロックなど）時のフォールバックを備えるべき。
  4) 未使用 props の削除：
     - RepoCard の columnKey は未使用で、呼び出し側との結合を強めていた。

## 本セッションで実施した最小リファクタ
- 追加: src/utils/openExternal.ts
  - window.open の安全利用ユーティリティ。null 返却（ブロック）や例外時は同タブ遷移にフォールバック。
- 変更: src/components/RepoCard.tsx
  - 未使用の columnKey props を削除。
  - openExternal を利用するよう置換。
  - role="button"、tabIndex、aria-label、Enter/Space で起動する onKeyDown を追加（キーボード操作対応）。
- 変更: src/components/RepoColumn.tsx
  - RepoCard 呼び出し時の columnKey 受け渡しを削除（現在のコードは <RepoCard repo={repo} /> のみ）。

以上の変更は現在のコードベースに反映済みであり、呼び出し側/利用側での破壊的変更は発生していません（columnKey は未使用だったため）。

## 詳細レビュー
### 1. 構成・モジュール境界
- 分類ロジックが utils と lib で重複。
  - utils 側: AppConfig を受け取り、daysSince を内部計算。しきい値は <= 判定。
  - lib 側: ClassifyOptions で now 指定可、差分日数計算や NaN/未来日扱いが明確。
- 推奨: 単一起点に集約し、もう一方は Adapter/Re-export に。仕様差異（inclusive/exclusive、丸め、未来日）の明文化とテストで担保。

### 2. アクセシビリティ（A11y）
- RepoCard に role="button"/tabIndex/aria-label/onKeyDown(Enter/Space) を追加し、キーボード操作に対応済み。
- 追加提案: フォーカスリングの明確化（focus-visible リング）、prefers-reduced-motion への配慮。

### 3. 外部リンクの安全性
- openExternal ユーティリティを新設し、window.open の戻り値が falsy（ブロック）でもフォールバック。
- 追加提案: Tauri/WebView 環境ではシェルオープンやプロトコルハンドラ利用の分岐（環境検出）を検討。

### 4. 型の厳密化・不要コード削減
- RepoCard の columnKey を削除済み。結合度低減とコンポーネント責務の明確化に寄与。
- 追加提案: 共通日付ユーティリティ（MS_PER_DAY、differenceInDays）を utils/date.ts に抽出し、分類ロジックから参照。

### 5. テスト
- utils と lib に分類テストが分かれており、重複検証になりがち。
- 推奨: 単一起点化後にテストも集約。Adapter 層の差分仕様だけ個別にテスト。

### 6. パフォーマンス
- 規模が拡大（数百〜数千 Repo）した場合に再計算コストが増大する可能性。
- 提案: フィルタ/ソート/分類結果の useMemo、入力のデバウンス、react-window などの仮想化導入を検討。

### 7. セキュリティ
- README にトークン取り扱いの注意は記載あり。実装では fetch 時のログ出力等に引き続き注意。
- 提案: 本番ビルドの source map 制御、開発時のトークンログ抑止、プロキシ雛形の docs 追記。

## 次のアクション（推奨ロードマップ）
1. 分類ロジックの単一起点化
   - 影響箇所の洗い出し → src/lib/classifyRepo.ts を主とする → utils/classify.ts は Adapter/Re-export 化。
   - 境界仕様（丸め、未来日、NaN、しきい値関係）をドキュメント化し、ユニットテストで固定。
2. 日付・しきい値ユーティリティの共通化
   - utils/date.ts に MS_PER_DAY, differenceInDays, isValidDate を用意し両者から参照。
3. A11y 継続改善
   - focus-visible のスタイル明確化、カード内操作子が増える場合はセマンティクスを適切化。
4. パフォーマンス最適化の準備
   - 大量データでのプロファイル → メモ化/デバウンス/仮想化の適用範囲を特定。
5. テスト統合と拡充
   - 重複テストの解消と境界ケース追加、i18n/ロケール差を見据えた時間表示のテスト整備。

## 参考（主な確認ファイル）
- src/components/RepoCard.tsx（A11y, openExternal 利用）
- src/components/RepoColumn.tsx（RepoCard 呼び出し）
- src/utils/openExternal.ts（外部リンク安全化ユーティリティ）
- src/utils/classify.ts / src/lib/classifyRepo.ts（重複する分類ロジック）

以上、Junie によるコードレビューと最小リファクタのレポートでした。