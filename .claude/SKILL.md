---
name: DevBoard Frontend Design
description: This skill should be used when the user asks to "デザインを改善して", "UIを洗練させて", "コンポーネントを作って", "画面をAppleっぽくして", "初心者向けにUIを調整して", "DevBoardのスタイルで作って". DevBoardのデザインシステムに沿った、洗練されつつも親しみやすいフロントエンドを構築する際に使用する。
version: 0.1.0
---

# DevBoard Frontend Design Skill

DevBoardは「非エンジニアや開発初心者がGitHubを管理しやすくする」ためのツール。このスキルは、Appleの洗練さと初心者への親しみやすさを両立させた、DevBoard独自のデザイン哲学に基づいてフロントエンドを構築するためのガイドライン。

---

## Design Philosophy: "Approachable Sophistication"

### Core Principle
**「複雑なものを、シンプルに見せる」**

GitHubの複雑さを隠し、ユーザーが本当にやりたいこと（リポジトリ管理、進捗確認、タスク整理）に集中できるようにする。Appleが技術的な複雑さを美しいインターフェースの裏に隠すように、DevBoardも同じアプローチを取る。

### The Three Pillars

#### 1. Sophisticated but Not Intimidating（洗練されているが威圧的でない）
- 高級感はあるが「使っていいのかな」と思わせない
- プロフェッショナルだが冷たくない
- 美しいが機能を犠牲にしない

#### 2. Friendly but Not Childish（フレンドリーだが子供っぽくない）
- 親しみやすいが軽薄ではない
- 楽しさはあるがふざけていない
- わかりやすいが見下していない

#### 3. Simple but Not Empty（シンプルだが空虚でない）
- 余白は意図を持って使う
- 削ぎ落とすが必要な情報は残す
- ミニマルだが温かみがある

---

## Design Thinking: Before You Code

コードを書く前に、以下を確認する：

### 1. Who is looking at this?（誰が見るのか）
DevBoardのユーザーは：
- プログラミングを学び始めた人
- GitHubの用語や概念に慣れていない人
- 「なんとなく動いている」状態から一歩進みたい人
- 技術に興味はあるが専門家ではない人

**常に問う：「GitHubを使い始めて3ヶ月の人が、これを見て迷わないか？」**

### 2. What emotion should this evoke?（どんな感情を呼び起こすか）
目指す感情：
- 「わかりやすい」
- 「自分にもできそう」
- 「ちょっといいツール使ってる感」
- 「整理されている安心感」

避ける感情：
- 「難しそう」
- 「エンジニア向けっぽい」
- 「ダサい」
- 「ごちゃごちゃしている」

### 3. What is the one thing?（最も重要なことは何か）
各画面・コンポーネントで「ユーザーが最初に理解すべきこと」を1つ決める。それを視覚的に最も目立たせる。

---

## Visual Language

### Color Philosophy

#### Semantic Colors（意味のある色）
色は装飾ではなく「意味」を伝える。DevBoardでは状態を色で直感的に理解させる：

| 状態 | 色 | 意味 |
|------|-----|------|
| Active/Success | Green | 順調、完了、アクティブ |
| In Progress | Blue/Cyan | 作業中、進行中 |
| Warning/Blocked | Orange/Amber | 注意が必要、停滞中 |
| Urgent/Overdue | Red | 緊急、期限切れ |
| Archived/Inactive | Gray | アーカイブ、非アクティブ |

#### Color Application Rules
- **背景**: 限りなく控えめに。白/オフホワイト（ライト）、ダークグレー（ダーク）
- **アクセント**: 状態を示す時のみ使用。装飾目的では使わない
- **テキスト**: 高コントラストを維持。グレーの濃淡でヒエラルキーを作る

### Typography Philosophy

#### Hierarchy through Weight, Not Size（サイズではなくウェイトで階層を作る）
- 見出しと本文のサイズ差は控えめに
- 太さ（weight）と色の濃さで重要度を示す
- 大きすぎる文字は威圧的に感じる

#### Readability First（読みやすさ最優先）
- 行間は広めに（1.5〜1.7）
- 1行の文字数は適度に（日本語で35〜45文字程度）
- 本文は16px以上を維持

### Spacing Philosophy: Breathe（余白は呼吸）

#### Generous but Purposeful（寛大だが意図的）
- 余白は「何もない」ではなく「休息」
- 要素間の余白で関連性を示す（近いものは関連、遠いものは別グループ）
- 画面端には十分なパディング

#### The 8px Grid
- すべてのスペーシングは8の倍数（8, 16, 24, 32, 48, 64...）
- 一貫性がプロフェッショナルな印象を作る

### Shape Philosophy: Soft but Defined（柔らかいが明確）

#### Border Radius
- カード・ボタン: 8px〜12px（柔らかいが崩れない）
- 小さな要素（バッジ、タグ）: 4px〜6pxまたはfull
- 過度な角丸（20px+）は避ける（子供っぽくなる）

#### Shadows
- 影は「浮いている」ではなく「そこにある」を表現
- ソフトで広がりのある影（blur多め、opacity低め）
- 色付きの影は使わない

---

## Component Guidelines

### Cards（カード）
DevBoardの主要な情報単位。リポジトリ、TODO、PRなどはすべてカードで表現。

**Design Principles:**
- 情報の塊を明確に区切る
- ホバー時に控えめなフィードバック（影を少し強く、または背景を少し明るく）
- カード内の情報は3階層まで（タイトル、サブ情報、メタ情報）

**Avoid:**
- カード内に情報を詰め込みすぎる
- 複数のCTAをカードに入れる
- 派手なホバーエフェクト

### Buttons（ボタン）

**Primary Action（主要アクション）**
- 画面に1つだけ
- 塗りつぶし + 高コントラスト
- 例：「+ リポジトリを追加」「+ New TODO」

**Secondary Action（副次アクション）**
- アウトラインまたは薄い背景
- 主要アクションより目立たない
- 例：「キャンセル」「詳細を見る」

**Tertiary Action（補助アクション）**
- テキストリンクスタイル
- 下線またはアイコンで識別
- 例：「すべて見る」「設定」

### Status Indicators（ステータス表示）

**Design Principles:**
- 色だけに頼らない（色覚多様性への配慮）
- アイコン + 色 + テキストの組み合わせ
- 一目で状態がわかる

**Pattern:**
```
[●] Active     → 緑の丸 + "Active" テキスト
[→] In Progress → 青の矢印 + "進行中" テキスト
[!] Blocked    → オレンジの警告 + "停滞中" テキスト
```

### Empty States（空の状態）

初心者にとって最も不安になる瞬間。丁寧に導く。

**Design Principles:**
- 「何もない」ではなく「始める場所」として表現
- 次のアクションを明確に提示
- イラストや絵文字で親しみやすく

**Example:**
```
[イラスト: 整理されたフォルダ]
"まだTODOがありません"
"GitHubのIssueをインポートするか、新しいTODOを作成しましょう"
[Import Issues] [+ New TODO]
```

---

## Interaction Guidelines

### Micro-interactions（マイクロインタラクション）

**Philosophy: Acknowledge, Don't Celebrate（認識させる、祝わない）**
- 操作が受け付けられたことを伝える
- 過度なアニメーションは避ける
- 0.15s〜0.3sの短いトランジション

**Where to Use:**
- ボタンホバー/クリック
- カードホバー
- トグル/スイッチ切り替え
- ローディング状態

**Avoid:**
- バウンス、スプリングなどの過度なイージング
- 0.5s以上のアニメーション
- 複数要素の同時アニメーション

### Feedback（フィードバック）

**Immediate Response（即時反応）**
- クリック → 0.1s以内に視覚的変化
- 送信/保存 → 即座にローディング表示
- 完了 → 0.3s以内に結果表示

**Loading States（ローディング）**
- スケルトンスクリーン推奨（スピナーより不安が少ない）
- 何をロードしているか伝える
- 2秒以上かかる場合は進捗を示す

---

## Language & Copy Guidelines

### Technical Terms（技術用語）

DevBoardのユーザーはGitHub用語に慣れていない可能性がある。

**Approach:**
- 技術用語は使うが、必ず文脈で理解できるように
- 初出時はさりげなく説明を添える
- アイコンで視覚的にも補助

**Examples:**
| 技術用語 | DevBoardでの表現 |
|---------|-----------------|
| Repository | リポジトリ（プロジェクト） |
| Pull Request | PR（変更リクエスト） |
| Issue | Issue（課題・タスク） |
| Commit | 更新 |
| Branch | ブランチ（作業の分岐） |

### Tone of Voice（声のトーン）

**Do:**
- 「〜できます」「〜しましょう」（可能性と提案）
- 「〜はここで確認」（案内）
- 短く、明確に

**Don't:**
- 「〜してください」の連発（命令的）
- 「〜する必要があります」（義務感）
- 長い説明文

---

## Anti-Patterns: What to Avoid

### Generic AI Aesthetics（AIっぽいデザインを避ける）
- 紫〜青のグラデーション背景
- 過度に丸いカード（border-radius: 24px+）
- キラキラ/グロー/ネオン効果
- 「AIが作りました」感のある均一さ

### Developer Tool Clichés（開発ツールの決まり文句を避ける）
- ダークモード＝かっこいい、の安易な発想
- モノスペースフォントの多用
- ターミナル風デザイン
- 情報密度の高すぎるダッシュボード

### Over-Engineering（やりすぎを避ける）
- 不要なアニメーション
- 複雑なグラデーション
- 3D効果
- パララックス

---

## Implementation Notes

### Tech Stack Assumptions
- React + TypeScript
- Tailwind CSS
- ダークモード対応済み

### CSS Custom Properties（推奨）
デザイントークンはCSS変数で管理し、一貫性を保つ：

```css
:root {
  /* Colors - Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Spacing */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

---

## Summary: The DevBoard Way

1. **User First**: 常に「GitHubを始めて3ヶ月の人」を想像する
2. **Clarity Over Cleverness**: 賢さより明確さ
3. **Calm Confidence**: 落ち着いた自信。派手さは不要
4. **Meaningful Details**: すべてのデザイン決定に理由がある
5. **Accessible Sophistication**: 洗練されているが、誰でも使える

---

*"The best interface is the one you don't have to think about."*
*最高のインターフェースは、考えなくても使えるもの。*
