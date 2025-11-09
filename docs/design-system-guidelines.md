# Design System モーションガイド

DevBoard のアニメーションは「控制された優雅さ」と「prefers-reduced-motion への配慮」の両立を目指しています。以下のトークンとパターンを守ることで、モーションに統一感が生まれます。

## 利用するトークン
- **duration**（`tokens.transitions.duration` / `--duration-*`）  
  - `instant`：100ms（Interaction feedback）
  - `fast`：150ms（ボタンの hover → active）
  - `normal`：250ms（カードやモーダルの昇降）
  - `slow`：400ms（ダイアログのフェードや大きな移動）
  - `lazy`：600ms（背景やオーバーレイのチカチカ抑制）
- **easing**（`tokens.transitions.easing` / `--easing-*`）  
  - `standard`：cubic-bezier(0.4, 0, 0.2, 1)
  - `decelerate`：cubic-bezier(0, 0, 0.2, 1)
  - `accelerate`：cubic-bezier(0.4, 0, 1, 1)
  - `spring`：cubic-bezier(0.175, 0.885, 0.32, 1.275)
- **stagger**（`tokens.transitions.stagger`）  
  - `card`: 50ms（カード列やカード群の stagger）
  - `listItem`: 30ms（リスト内の細かい要素）

```ts
const hoverElevate = `transform ${tokens.transitions.duration.normal} ${tokens.transitions.easing.standard}`;
const listEntry = `opacity ${tokens.transitions.duration.fast} ${tokens.transitions.easing.decelerate}`;
```

## パターン例
1. **カードのホバーステート**  
   フォーカス／hover では `transform` を使ってわずかに持ち上げ、通常 `standard` を使い、`motion-reduce:transition-none` を併記します。

   ```tsx
   className={`transition-transform ${focusRing.default} motion-safe:duration-[var(--duration-normal)] motion-safe:ease-standard motion-reduce:transition-none`}
   ```

2. **ボタンの押下**  
   `fast` → `instant` へ移行させることでレスポンスを感じさせ、`focus-visible` には `focusRing` を利用します。

3. **モーダル／オーバーレイ**  
   オーバーレイ本体は `opacity` で `slow`、コンテンツカードは `normal` を使い `stagger.card` を適用すると奥行き感が出ます。

4. **リスト更新**  
   `listItem` スタガーを使って `opacity` と `translateY` を段階的にアニメートし、`prefers-reduced-motion` では `motion-reduce:animate-none` を適用。

## Motion Reduce の定義
- `motion-reduce:transition-none` と `motion-reduce:animate-none` を、すべての `transition-*` / `animation-*` クラスに付与する。
- `motion-reduce` の重複を避けるため、ベースクラスにまとめて記述します（例: `className="motion-safe:transition-all motion-reduce:transition-none"`）。

## 実装時のチェックリスト
1. トークンを使っているか（duration, easing, stagger）。
2. `focusRing` / CSS フォーカスルールが統一されているか。
3. `motion-reduce` スイッチがすべての重要なトランジションに入っているか。

このガイドは Phase 0 の設計を踏まえて、今後のブランドカラー導入や Surface 表現にも拡張されます。
