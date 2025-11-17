# DevBoard Design System ガイド

ブランド表現を均質に保つための設計原則をまとめました。タイポグラフィ／スペーシング／モーションをすべてトークン化し、Tailwind クラスとして直接呼び出せます。

---

## 1. タイポグラフィ

### 1.1 セマンティックスケール

| Token / Class      | px / line-height | 主な用途 |
|-------------------|------------------|----------|
| `text-display-lg` | 60 / 1.1         | ランディングのヒーロー |
| `text-display`    | 48 / 1.15        | 大きな見出し |
| `text-title-1`    | 36 / 1.2         | セクション見出し |
| `text-title-2`    | 28 / 1.3         | カード見出し / モーダルタイトル |
| `text-title-3`    | 20 / 1.4         | ラベル付き UI |
| `text-body`       | 16 / 1.6         | 段落本文 |
| `text-body-sm`    | 14 / 1.5         | 補足テキスト、ボタン |
| `text-caption`    | 12 / 1.4         | メタ情報、バッジ |
| `text-label`      | 14 / 1.0 (-0.4em)| ピル型バッジなどのラベル |

**ルール**

1. `text-*` に素のサイズ（`text-2xl` など）を使わない。
2. 行間とレタースペーシングはクラスに内包されているため追加しない。
3. 文字色はデザイントークン（例: `text-[var(--text-muted)]`）で制御。

```tsx
<h2 className="text-title-2 font-semibold text-[var(--text-primary)]">
  DevBoard の主なユースケース
</h2>
<p className="text-body text-[var(--text-muted)]">
  スプリント計画からレビューまで、開発プロセス全体をカバーします。
</p>
```

---

## 2. スペーシング

### 2.1 トークン体系

| 系列   | Token        | px  | 用途                          |
|--------|--------------|-----|-------------------------------|
| Inset  | `inset-xs`   | 8   | ボタン/カードの最小余白       |
|        | `inset-sm`   | 12  | pills, compact section        |
|        | `inset-md`   | 16  | 標準カード/入力の padding     |
|        | `inset-lg`   | 24  | ヒーロー/CTA                  |
|        | `inset-xl`   | 32  | 大型ヒーロー                  |
| Stack  | `stack-xs`   | 8   | 縦方向の最小間隔              |
|        | `stack-sm`   | 16  | 段落間 / コンポーネント間隔   |
|        | `stack-md`   | 24  | ブロック間                    |
|        | `stack-lg`   | 48  | セクション間                  |
|        | `stack-xl`   | 64  | ヒーローブロック間            |
| Inline | `inline-xs`  | 4   | アイコンとテキストの隙間      |
|        | `inline-sm`  | 8   | ボタン内アイコン              |
|        | `inline-md`  | 12  | カードヘッダーの余白          |
|        | `inline-lg`  | 16  | セクション内の要素             |

**使い分け**

- `p-inset-*`：上下左右を同じ値で取りたいとき。
- `py-stack-*` / `my-stack-*`：縦方向。
- `px-inline-*` / `gap-inline-*`：横方向。
- `space-y-stack-*`：縦リストのリズムを揃える。

```tsx
<div className="flex flex-col gap-stack-sm p-inset-lg rounded-2xl bg-surface-primary">
  <div className="flex items-center gap-inline-md">
    <Icon />
    <h3 className="text-title-3">最新アクティビティ</h3>
  </div>
  <ul className="space-y-stack-xs">
    {items.map((item) => (
      <li key={item.id} className="flex items-center justify-between py-stack-xs">
        <span className="text-body text-[var(--text-primary)]">{item.title}</span>
        <time className="text-caption text-[var(--text-muted)]">{item.relativeTime}</time>
      </li>
    ))}
  </ul>
</div>
```

---

## 3. モーション

### 3.1 トークン

| 種別     | Token       | 値                                   |
|----------|-------------|--------------------------------------|
| Duration | `instant`   | 100ms – 入力フィードバック           |
|          | `fast`      | 150ms – ボタン hover → press         |
|          | `normal`    | 250ms – カード、モーダルの昇降       |
|          | `slow`      | 400ms – オーバーレイ、背景           |
|          | `lazy`      | 600ms – メッシュやノイズ             |
| Easing   | `standard`  | cubic-bezier(0.4, 0, 0.2, 1)          |
|          | `decelerate`| cubic-bezier(0, 0, 0.2, 1)            |
|          | `accelerate`| cubic-bezier(0.4, 0, 1, 1)            |
|          | `spring`    | cubic-bezier(0.175, 0.885, 0.32, 1.275)|
| Stagger  | `card`      | 50ms                                 |
|          | `listItem`  | 30ms                                 |

### 3.2 パターン

1. **カード hover/drag**  
   - `whileHover={{ y: -4 }}` と `transition={{ duration: 0.25, ease: tokens.transitions.easing.standard }}` をセット。  
   - Drag 時は spring を使い `transition={{ type: 'spring', stiffness: 300, damping: 30 }}`。
2. **CTA / PremiumButton**  
   - グラデーション位相移動は `duration.lazy`、押下は `duration.instant`。  
   - `motion-reduce:transition-none` を併用。
3. **モーダル / GlassModal**  
   - バックドロップ `opacity` を `slow`、本体 `scale` を `normal`。  
   - `prefers-reduced-motion` 時は `AnimatePresence` をスキップ。

### 3.3 Motion Reduce

- `@media (prefers-reduced-motion: reduce)` で `animation-duration: 0.01ms` にフォールバック。
- Tailwind では `motion-reduce:animate-none` `motion-reduce:transition-none` を必ずセット。

```tsx
<motion.div
  className="group relative rounded-[24px] border p-inset-lg overflow-hidden motion-safe:transition-all motion-reduce:transition-none"
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45, ease: tokens.transitions.easing.standard, delay: index * tokens.transitions.stagger.card }}
>
  {/* ... */}
</motion.div>
```

---

## 4. 実装チェックリスト

1. **Typography**：すべて `text-*` セマンティッククラスを使用し、`font-weight` のみで強弱を付ける。  
2. **Spacing**：`inset` / `stack` / `inline` トークンで余白と `gap` を設定する。  
3. **Motion**：`tokens.transitions.*` に沿った `duration` / `easing` を使用し、`motion-reduce` を必ず付与。  
4. **Focus**：`focusRing` プリセットをインタラクティブ要素に適用し、WCAG AA コントラストを保つ。  
5. **Light/Dark**：`useTheme` + CSS 変数で両テーマを即時に切替できることを確認する。  

このガイドを開発の入口で参照すれば、ブランドカラー、タイポグラフィ、モーションの整合性が担保されます。新規コンポーネントを追加する際も、ここに記載のトークン以外を導入しないようにしてください。
