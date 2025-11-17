# DevBoard AI統合機能実装計画書

**作成日**: 2025-11-17
**バージョン**: 1.0
**ステータス**: 計画中
**優先度**: 2（タグ機能の次）

## 1. 概要

### 1.1 目的
DevBoardにAIアシスタント機能を統合し、Issue/PR作成支援、コードレビュー、実装提案などの開発作業を効率化する。

### 1.2 スコープ
- **対応AI**: Claude (Anthropic) + GitHub Copilot
- **主要機能**: Issue/PR実装支援、コードレビュー、メンション機能
- **認証方式**: サブスクリプションアカウント連携 + 個人APIキー（オプション）
- **統合ポイント**: Issue詳細、PR詳細、リポジトリカード、専用チャットパネル

### 1.3 成功基準
- ✅ Claude APIとGitHub Copilot APIの両方に対応
- ✅ Issue/PRの内容を理解してコード実装を提案
- ✅ Pull Requestのコードレビュー機能
- ✅ メンション機能（@claude, @copilot）で簡単に呼び出し
- ✅ サブスクアカウント + APIキー設定の両方に対応
- ✅ チャット履歴の保存と管理
- ✅ トークン使用量の表示と管理

---

## 2. アーキテクチャ設計

### 2.1 データモデル

```typescript
// src/types/ai.ts

/**
 * AI プロバイダー
 */
export type AIProvider = 'claude' | 'copilot';

/**
 * AI 設定
 */
export type AIConfig = {
  provider: AIProvider;
  authType: 'subscription' | 'api-key';
  apiKey?: string;              // API キー（authType が 'api-key' の場合）
  model?: string;               // 使用モデル（例: "claude-3-5-sonnet-20241022"）
  enabled: boolean;
};

/**
 * AI チャットメッセージ
 */
export type AIChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider: AIProvider;
  tokenCount?: number;
};

/**
 * AI チャットセッション
 */
export type AIChatSession = {
  id: string;
  title: string;
  repoId?: string;              // 関連リポジトリ
  issueNumber?: number;         // 関連Issue番号
  prNumber?: number;            // 関連PR番号
  messages: AIChatMessage[];
  createdAt: string;
  updatedAt: string;
  provider: AIProvider;
};

/**
 * AI レビュー結果
 */
export type AIReviewResult = {
  id: string;
  prNumber: number;
  repoId: string;
  provider: AIProvider;
  summary: string;              // レビュー要約
  suggestions: AIReviewSuggestion[];
  createdAt: string;
};

export type AIReviewSuggestion = {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestedCode?: string;
};

/**
 * AI 実装提案
 */
export type AIImplementationSuggestion = {
  id: string;
  issueNumber: number;
  repoId: string;
  provider: AIProvider;
  approach: string;             // 実装アプローチの説明
  files: AIFileSuggestion[];    // 変更が必要なファイル
  steps: string[];              // 実装ステップ
  estimatedEffort: string;      // 見積もり工数
  createdAt: string;
};

export type AIFileSuggestion = {
  path: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
  suggestedCode?: string;
};

/**
 * トークン使用量
 */
export type TokenUsage = {
  date: string;                 // YYYY-MM-DD
  provider: AIProvider;
  inputTokens: number;
  outputTokens: number;
  totalCost?: number;           // USD（APIキー使用時）
};
```

### 2.2 ストレージ設計

**ストレージキー:**
- `github-dashboard-ai-config:{accountId}` → `Record<AIProvider, AIConfig>`
- `github-dashboard-ai-sessions:{accountId}` → `AIChatSession[]`
- `github-dashboard-ai-token-usage:{accountId}` → `TokenUsage[]`

**セキュリティ考慮:**
- APIキーは暗号化してlocalStorageに保存
- または、Cloudflare KVに保存（より安全）

### 2.3 API設計

#### Cloudflare Functions エンドポイント

```
/api/ai/chat
  POST - チャットメッセージ送信
  Body: { provider, message, sessionId?, context? }
  Response: { reply, tokenUsage }

/api/ai/review-pr
  POST - Pull Requestレビュー
  Body: { provider, repoId, prNumber }
  Response: { reviewResult }

/api/ai/suggest-implementation
  POST - 実装提案生成
  Body: { provider, repoId, issueNumber }
  Response: { suggestion }

/api/ai/models
  GET - 利用可能なモデル一覧取得
  Query: { provider }
  Response: { models: string[] }

/api/ai/token-usage
  GET - トークン使用量取得
  Query: { accountId, startDate, endDate }
  Response: { usage: TokenUsage[] }
```

#### Claude API統合

```typescript
// Anthropic SDK使用
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || userApiKey,
});

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  messages: [
    { role: 'user', content: prompt }
  ],
});
```

#### GitHub Copilot API統合

```typescript
// GitHub Copilot Chat API
// 注: 現在ベータ版、正式リリース後に実装

const response = await fetch('https://api.github.com/copilot/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${githubToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: prompt }
    ],
  }),
});
```

### 2.4 コンポーネント構成

```
App
├── AIPanel (NEW)                    // AIチャットパネル（サイドバー or モーダル）
│   ├── AIProviderSelector          // Claude / Copilot 選択
│   ├── AIChatWindow                // チャットUI
│   └── AISessionHistory            // 過去のセッション
├── Settings
│   └── AISettings (NEW)            // AI設定画面
│       ├── ProviderConfig          // プロバイダー別設定
│       ├── APIKeyInput             // APIキー入力
│       └── TokenUsageDisplay       // 使用量表示
├── RepoCard
│   └── AIActionMenu (NEW)          // AI アクションメニュー
│       ├── "AIに実装を相談"
│       └── "AIにレビューを依頼"
├── IssueDetail (NEW or 拡張)
│   ├── AIImplementationButton      // 実装提案ボタン
│   └── AIImplementationPanel       // 提案結果表示
└── PRDetail (NEW or 拡張)
    ├── AIReviewButton              // レビュー依頼ボタン
    └── AIReviewPanel               // レビュー結果表示
```

---

## 3. 実装フェーズ

### フェーズ1: 基盤構築 (3-4h)

#### タスク

1. **型定義作成** (`src/types/ai.ts`)
   - AIConfig, AIChatMessage, AIChatSession等の型定義

2. **AI設定ストレージ** (`src/utils/aiStorage.ts`)
   ```typescript
   - getAIConfig(accountId: string, provider: AIProvider): AIConfig
   - saveAIConfig(accountId: string, provider: AIProvider, config: AIConfig): void
   - getAISessions(accountId: string): AIChatSession[]
   - saveSession(accountId: string, session: AIChatSession): void
   - getTokenUsage(accountId: string, startDate: string, endDate: string): TokenUsage[]
   - recordTokenUsage(accountId: string, usage: TokenUsage): void
   ```

3. **APIキー暗号化ユーティリティ** (`src/utils/encryption.ts`)
   ```typescript
   - encryptAPIKey(apiKey: string): string
   - decryptAPIKey(encrypted: string): string
   ```

4. **Cloudflare Functions実装**
   - `/api/ai/chat` エンドポイント
   - Claude API統合（Anthropic SDK）
   - GitHub Copilot API統合（準備）
   - エラーハンドリングとレート制限

5. **カスタムフック** (`src/hooks/useAI.ts`)
   ```typescript
   export function useAI(provider: AIProvider) {
     const { currentAccount } = useAuth();
     const [config, setConfig] = useState<AIConfig | null>(null);
     const [isLoading, setIsLoading] = useState(false);

     const sendMessage = async (message: string, sessionId?: string) => { ... };
     const reviewPR = async (repoId: string, prNumber: number) => { ... };
     const suggestImplementation = async (repoId: string, issueNumber: number) => { ... };

     return { config, sendMessage, reviewPR, suggestImplementation, isLoading };
   }
   ```

#### 成果物
- `src/types/ai.ts`
- `src/utils/aiStorage.ts`
- `src/utils/encryption.ts`
- `functions/api/ai/chat.ts`
- `functions/api/ai/review-pr.ts`
- `functions/api/ai/suggest-implementation.ts`
- `src/hooks/useAI.ts`

---

### フェーズ2: AI設定UI (2-3h)

#### 2.1 AI設定画面

**ファイル**: `src/components/AISettings.tsx`

**機能:**
- プロバイダー選択（Claude / Copilot）
- 認証タイプ選択（サブスクリプション / APIキー）
- APIキー入力フォーム
  - セキュアな入力（password type）
  - 保存時に暗号化
  - テスト接続機能
- モデル選択（利用可能なモデルのドロップダウン）
- トークン使用量表示
  - 日別グラフ
  - 月間合計
  - コスト見積もり（APIキー使用時）

**UI構成:**
```
┌─────────────────────────────────────────┐
│ AI設定                         [×]       │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Claude                              │ │
│ │ ● サブスクリプション  ○ APIキー    │ │
│ │                                     │ │
│ │ [APIキーを設定]                    │ │
│ │ モデル: [claude-3-5-sonnet ▼]     │ │
│ │ [テスト接続]                       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ GitHub Copilot                      │ │
│ │ ● サブスクリプション  ○ APIキー    │ │
│ │                                     │ │
│ │ ※ GitHub連携が必要です             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ トークン使用量（今月）                  │
│ ┌─────────────────────────────────────┐ │
│ │ Claude:   45,234 tokens ($0.68)    │ │
│ │ Copilot:  12,891 tokens            │ │
│ │ [詳細を表示]                       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│                          [保存] [閉じる]│
└─────────────────────────────────────────┘
```

#### 成果物
- `src/components/AISettings.tsx`
- `src/components/TokenUsageChart.tsx`

---

### フェーズ3: AIチャットパネル (4-5h)

#### 3.1 AIチャットパネル

**ファイル**: `src/components/AIPanel.tsx`

**機能:**
- サイドバー or モーダル形式
- プロバイダー選択タブ（Claude / Copilot）
- チャット入力エリア
  - マークダウン対応
  - コードブロック対応
  - メンション機能（@claude, @copilot）
- メッセージ表示
  - ユーザー/アシスタントの区別
  - タイムスタンプ
  - コードシンタックスハイライト
  - コピーボタン
- セッション管理
  - 新規セッション作成
  - セッション一覧
  - セッション削除
- コンテキスト自動注入
  - 選択中のリポジトリ情報
  - 開いているIssue/PR情報

**UI構成:**
```
┌─────────────────────────────────────────┐
│ AI アシスタント               [_][×]    │
├─────────────────────────────────────────┤
│ [Claude] [Copilot]        [新規セッション]│
├─────────────────────────────────────────┤
│                                         │
│ 🤖 Claude                               │
│ こんにちは！何かお手伝いできることは？  │
│ 12:34                                   │
│                                         │
│ 👤 あなた                               │
│ このIssueの実装方法を教えて            │
│ 12:35                                   │
│                                         │
│ 🤖 Claude                               │
│ Issue #123の実装について説明します...   │
│ ```typescript                           │
│ // コード例                             │
│ ```                                     │
│ [コピー]                                │
│ 12:35                                   │
│                                         │
├─────────────────────────────────────────┤
│ メッセージを入力... [Markdown対応]      │
│ [@claude] [@copilot] [📎]        [送信] │
└─────────────────────────────────────────┘
```

#### 3.2 メンション機能

**実装:**
- テキストエリアで `@` 入力時にオートコンプリート表示
- `@claude` または `@copilot` でプロバイダー切り替え
- メンション付きメッセージは該当プロバイダーに送信

#### 3.3 コンテキスト注入

**自動コンテキスト:**
```typescript
function buildContext(repo?: Repo, issue?: Issue, pr?: PullRequest) {
  return `
リポジトリ: ${repo?.nameWithOwner}
説明: ${repo?.description}
言語: ${repo?.primaryLanguage}
${issue ? `Issue #${issue.number}: ${issue.title}` : ''}
${pr ? `PR #${pr.number}: ${pr.title}` : ''}
  `.trim();
}
```

#### 成果物
- `src/components/AIPanel.tsx`
- `src/components/AIChatWindow.tsx`
- `src/components/AIProviderSelector.tsx`
- `src/components/AISessionHistory.tsx`
- `src/utils/aiContext.ts`

---

### フェーズ4: Issue/PR統合 (3-4h)

#### 4.1 Issue実装提案

**ファイル**: `src/components/IssueDetail.tsx` (新規 or 拡張)

**機能:**
- Issueの内容を解析してAIが実装提案
- 実装アプローチの説明
- 変更が必要なファイルのリスト
- 実装ステップの提示
- 見積もり工数の表示
- 提案をチャットで詳細相談

**UI構成:**
```
┌─────────────────────────────────────────┐
│ Issue #123: 新機能追加                  │
├─────────────────────────────────────────┤
│ タイトル: ユーザー認証機能の追加        │
│ 本文: ...                               │
│                                         │
│ [🤖 AIに実装を相談]                    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ AI実装提案 (by Claude)              │ │
│ │                                     │ │
│ │ **アプローチ:**                     │ │
│ │ OAuth 2.0を使用した認証フローを実装 │ │
│ │                                     │ │
│ │ **変更ファイル:**                   │ │
│ │ ✏️ src/auth/oauth.ts (作成)        │ │
│ │ ✏️ src/contexts/AuthContext.tsx    │ │
│ │ ✏️ functions/api/auth/callback.ts  │ │
│ │                                     │ │
│ │ **実装ステップ:**                   │ │
│ │ 1. OAuth設定の追加                  │ │
│ │ 2. 認証フローの実装                 │ │
│ │ 3. トークン管理の実装               │ │
│ │                                     │ │
│ │ **見積もり工数:** 4-6時間           │ │
│ │                                     │ │
│ │ [詳細を相談] [コードを生成]        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### 4.2 PRコードレビュー

**ファイル**: `src/components/PRDetail.tsx` (新規 or 拡張)

**機能:**
- PRの差分を解析してAIがレビュー
- コード品質の評価
- 潜在的なバグの指摘
- ベストプラクティスの提案
- セキュリティ脆弱性のチェック
- ファイル・行単位のコメント

**UI構成:**
```
┌─────────────────────────────────────────┐
│ PR #456: バグ修正                       │
├─────────────────────────────────────────┤
│ タイトル: 認証エラーの修正              │
│ 変更ファイル: 3 files changed           │
│                                         │
│ [🤖 AIにレビューを依頼]                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ AIレビュー結果 (by Claude)          │ │
│ │                                     │ │
│ │ **要約:**                           │ │
│ │ 全体的に良い修正です。いくつかの改善 │ │
│ │ 提案があります。                    │ │
│ │                                     │ │
│ │ **指摘事項:**                       │ │
│ │                                     │ │
│ │ ⚠️ src/auth/oauth.ts:42            │ │
│ │ エラーハンドリングが不十分です。    │ │
│ │ try-catchブロックを追加してください │ │
│ │ ```typescript                       │ │
│ │ try {                               │ │
│ │   // existing code                  │ │
│ │ } catch (error) {                   │ │
│ │   logger.error(error);              │ │
│ │ }                                   │ │
│ │ ```                                 │ │
│ │                                     │ │
│ │ ℹ️ src/contexts/AuthContext.tsx:15  │ │
│ │ useMemoを使用して最適化できます     │ │
│ │                                     │ │
│ │ [詳細を相談] [GitHubにコメント]    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### 4.3 RepoCardアクションメニュー

**修正ファイル**: `src/components/RepoCard.tsx`

**追加機能:**
- カードの右クリックメニューにAIアクション追加
- 「AIに相談」→ チャットパネルを開く（リポジトリコンテキスト付き）

#### 成果物
- `src/components/IssueDetail.tsx`
- `src/components/PRDetail.tsx`
- `src/components/AIImplementationPanel.tsx`
- `src/components/AIReviewPanel.tsx`
- 修正: `src/components/RepoCard.tsx`

---

### フェーズ5: プロンプトエンジニアリング (2-3h)

#### タスク

1. **Issue実装提案プロンプト最適化**
   ```typescript
   const implementationPrompt = `
あなたはシニアソフトウェアエンジニアです。以下のIssueの実装方法を提案してください。

リポジトリ情報:
- 名前: ${repo.nameWithOwner}
- 言語: ${repo.primaryLanguage}
- 説明: ${repo.description}

Issue情報:
- #${issue.number}: ${issue.title}
- 本文: ${issue.body}

以下の形式で回答してください:
1. 実装アプローチ（2-3文）
2. 変更が必要なファイルのリスト（アクション: 作成/修正/削除）
3. 実装ステップ（箇条書き）
4. 見積もり工数
   `;
   ```

2. **PRレビュープロンプト最適化**
   ```typescript
   const reviewPrompt = `
あなたは経験豊富なコードレビュアーです。以下のPull Requestをレビューしてください。

リポジトリ情報:
- 名前: ${repo.nameWithOwner}
- 言語: ${repo.primaryLanguage}

PR情報:
- #${pr.number}: ${pr.title}
- 説明: ${pr.body}

変更差分:
${diff}

以下の観点でレビューしてください:
1. コード品質
2. 潜在的なバグ
3. セキュリティ脆弱性
4. パフォーマンス
5. ベストプラクティス

各指摘には以下を含めてください:
- ファイル名と行番号
- 重要度（info/warning/error）
- 具体的な改善提案
- 推奨コード（可能な場合）
   `;
   ```

3. **コンテキストウィンドウ管理**
   - 長いIssue/PR本文の要約
   - 差分が大きい場合の分割処理
   - トークン数の事前推定

#### 成果物
- `src/prompts/implementation.ts`
- `src/prompts/review.ts`
- `src/utils/tokenEstimator.ts`

---

### フェーズ6: サブスクリプション連携 (3-4h)

#### 6.1 Claude Subscription連携

**方式1: OAuth認証（推奨）**
- Anthropic Console でOAuthアプリ作成
- 認証フロー実装
- アクセストークン取得・管理

**方式2: Workspaces API（企業向け）**
- Anthropic Workspacesとの連携
- チームメンバー管理
- 使用量の一元管理

#### 6.2 GitHub Copilot Subscription連携

**方式: GitHub OAuth拡張**
- 既存のGitHub OAuth flowを拡張
- Copilot利用権限の確認
- GitHub Appとして登録

#### 実装

**Cloudflare Functions:**
```typescript
// functions/api/auth/anthropic-oauth.ts
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // OAuth認証URL生成
  const authUrl = `https://auth.anthropic.com/oauth/authorize?client_id=${env.ANTHROPIC_CLIENT_ID}&redirect_uri=${env.REDIRECT_URI}&response_type=code&scope=api`;

  return Response.redirect(authUrl);
}

// functions/api/auth/anthropic-callback.ts
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // トークン交換
  const tokenResponse = await fetch('https://auth.anthropic.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.ANTHROPIC_CLIENT_ID,
      client_secret: env.ANTHROPIC_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  const { access_token } = await tokenResponse.json();

  // セッションに保存
  // ... (既存のセッション管理を拡張)
}
```

#### 成果物
- `functions/api/auth/anthropic-oauth.ts`
- `functions/api/auth/anthropic-callback.ts`
- `src/contexts/AIAuthContext.tsx`

---

### フェーズ7: 仕上げ・テスト (2-3h)

#### 7.1 エラーハンドリング

1. **APIエラー**
   - レート制限（429）→ リトライ + ユーザー通知
   - 認証エラー（401）→ 再認証促進
   - トークン不足（402）→ プラン案内
   - サーバーエラー（500）→ フォールバック

2. **ネットワークエラー**
   - タイムアウト処理
   - オフライン検出
   - リトライロジック

3. **ユーザー入力エラー**
   - 不正なAPIキー
   - コンテキストが大きすぎる
   - 空メッセージ

#### 7.2 パフォーマンス最適化

1. **ストリーミングレスポンス**
   - Server-Sent Events (SSE)でリアルタイム表示
   - チャンク単位でメッセージ表示

2. **キャッシュ戦略**
   - 同じIssue/PRへの重複リクエスト防止
   - レビュー結果のキャッシュ（24時間）

3. **トークン最適化**
   - システムプロンプトの最適化
   - 不要なコンテキストの削除

#### 7.3 セキュリティ

1. **APIキー保護**
   - 暗号化保存
   - HTTPS通信必須
   - キーの定期ローテーション推奨

2. **入力サニタイゼーション**
   - プロンプトインジェクション対策
   - XSS対策

3. **レート制限**
   - ユーザーごとの制限
   - アカウントごとの制限

#### 7.4 アクセシビリティ

1. **キーボード操作**
   - チャット入力: Enter送信、Shift+Enter改行
   - ショートカット: Cmd+K でAIパネル開く

2. **スクリーンリーダー**
   - AIメッセージに `aria-live="polite"`
   - ボタンに適切な `aria-label`

#### 7.5 テスト

1. **ユニットテスト**
   - プロンプト生成ロジック
   - トークン推定
   - コンテキスト構築

2. **統合テスト**
   - Claude API呼び出し（モック）
   - エラーハンドリング
   - キャッシュ動作

3. **E2Eテスト**
   - チャットフロー
   - Issue実装提案
   - PRレビュー

#### 成果物
- エラーハンドリングの実装
- パフォーマンス最適化
- セキュリティ強化
- テストコード

---

## 4. 技術仕様詳細

### 4.1 Claude API

**モデル選択:**
- `claude-3-5-sonnet-20241022` (推奨) - 最新、高性能
- `claude-3-opus-20240229` - 最高精度、高コスト
- `claude-3-haiku-20240307` - 高速、低コスト

**トークン制限:**
- Sonnet: 200K入力 + 4K出力
- Opus: 200K入力 + 4K出力
- Haiku: 200K入力 + 4K出力

**料金（2025年1月時点）:**
- Sonnet: $3 / 1M入力トークン、$15 / 1M出力トークン
- Opus: $15 / 1M入力トークン、$75 / 1M出力トークン
- Haiku: $0.25 / 1M入力トークン、$1.25 / 1M出力トークン

### 4.2 GitHub Copilot API

**現状:**
- GitHub Copilot Chat API（ベータ版）
- VS Code拡張機能としては利用可能
- スタンドアロンAPI: 正式リリース待ち

**代替案（当面）:**
- GitHub Copilot サブスクリプション所持の確認のみ
- VS Code拡張機能との連携案内
- Claude APIを優先使用

### 4.3 プロンプトテンプレート

#### Issue実装提案

```typescript
export const IMPLEMENTATION_PROMPT_TEMPLATE = `
あなたは{primaryLanguage}に精通したシニアソフトウェアエンジニアです。

リポジトリ: {repoName}
説明: {repoDescription}

以下のIssueの実装方法を提案してください:

Issue #{issueNumber}: {issueTitle}
{issueBody}

以下のJSON形式で回答してください:
{
  "approach": "実装アプローチの説明（2-3文）",
  "files": [
    {
      "path": "ファイルパス",
      "action": "create|modify|delete",
      "description": "変更内容の説明"
    }
  ],
  "steps": ["ステップ1", "ステップ2", ...],
  "estimatedEffort": "見積もり工数（例: 2-4時間）"
}
`;
```

#### PRレビュー

```typescript
export const REVIEW_PROMPT_TEMPLATE = `
あなたは経験豊富なコードレビュアーです。

リポジトリ: {repoName}
言語: {primaryLanguage}

以下のPull Requestをレビューしてください:

PR #{prNumber}: {prTitle}
{prBody}

変更差分:
{diff}

以下のJSON形式で回答してください:
{
  "summary": "レビュー要約（2-3文）",
  "suggestions": [
    {
      "file": "ファイルパス",
      "line": 行番号,
      "severity": "info|warning|error",
      "message": "指摘内容",
      "suggestedCode": "推奨コード（オプション）"
    }
  ]
}

以下の観点で評価してください:
- コード品質とベストプラクティス
- 潜在的なバグ
- セキュリティ脆弱性
- パフォーマンス
- 可読性と保守性
`;
```

---

## 5. UI/UXデザインガイドライン

### 5.1 デザインシステム準拠

**適用ルール:**
- Typography: `text-body` (チャット), `text-body-sm` (メタ情報)
- Spacing: `gap-inline-md`, `p-inset-lg`
- Focus: `focusRing` preset適用
- Motion: `motion-reduce:animate-none`
- Metallic: AIパネルヘッダー、レビュー結果カードに使用

### 5.2 カラースキーム

**AIプロバイダー識別色:**
- Claude: `#D97757` (ブランドカラー: オレンジ系)
- Copilot: `#22C55E` (GitHubグリーン)

**メッセージロール:**
- ユーザー: 右寄せ、`bg-brand-purple/10`
- アシスタント: 左寄せ、`bg-surface-subtle`
- システム: 中央寄せ、`bg-neutral/5`

### 5.3 アニメーション

**チャットメッセージ:**
```typescript
const messageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
```

**レビュー結果:**
```typescript
const reviewVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { staggerChildren: 0.1 }
  },
};
```

---

## 6. マイルストーン

| フェーズ | 完了条件 | 見積もり |
|---------|---------|---------|
| Phase 1 | API基盤構築、Claude API統合完了 | 3-4h |
| Phase 2 | AI設定画面が動作 | 2-3h |
| Phase 3 | チャットパネルが動作、メンション機能実装 | 4-5h |
| Phase 4 | Issue/PR統合、実装提案・レビュー機能動作 | 3-4h |
| Phase 5 | プロンプト最適化、精度向上 | 2-3h |
| Phase 6 | サブスク連携実装 | 3-4h |
| Phase 7 | エラーハンドリング、テスト完了 | 2-3h |

**合計見積もり: 19-26時間**

---

## 7. テストシナリオ

### 7.1 機能テスト

1. **チャット機能**
   - [ ] メッセージ送信（Claude）
   - [ ] メッセージ送信（Copilot）
   - [ ] マークダウン表示
   - [ ] コードブロック表示
   - [ ] セッション保存・読み込み
   - [ ] メンション機能

2. **Issue実装提案**
   - [ ] Issue解析と提案生成
   - [ ] ファイルリスト表示
   - [ ] 実装ステップ表示
   - [ ] 見積もり工数表示
   - [ ] チャットで詳細相談

3. **PRレビュー**
   - [ ] PR差分解析
   - [ ] レビュー結果表示
   - [ ] ファイル・行単位の指摘
   - [ ] 重要度の色分け
   - [ ] 推奨コード表示

4. **設定管理**
   - [ ] APIキー保存・暗号化
   - [ ] プロバイダー切り替え
   - [ ] モデル選択
   - [ ] テスト接続
   - [ ] トークン使用量表示

### 7.2 エラーハンドリングテスト

1. **APIエラー**
   - [ ] 無効なAPIキー（401）
   - [ ] レート制限（429）
   - [ ] トークン不足（402）
   - [ ] サーバーエラー（500）

2. **ネットワークエラー**
   - [ ] タイムアウト
   - [ ] オフライン
   - [ ] 接続失敗

3. **入力エラー**
   - [ ] 空メッセージ
   - [ ] 長すぎるメッセージ
   - [ ] 不正な文字

### 7.3 パフォーマンステスト

1. **応答時間**
   - [ ] チャット応答 < 3秒
   - [ ] Issue提案 < 10秒
   - [ ] PRレビュー < 15秒

2. **トークン効率**
   - [ ] プロンプト最適化
   - [ ] 不要コンテキストの削減

---

## 8. セキュリティ考慮事項

### 8.1 APIキー保護

**保存方式:**
```typescript
// 暗号化してlocalStorageに保存
const encrypted = await encryptAPIKey(apiKey, userSecret);
localStorage.setItem(`ai-key:${provider}`, encrypted);

// または、Cloudflare KVに保存（より安全）
await env.KV.put(`ai-key:${accountId}:${provider}`, apiKey, {
  expirationTtl: 86400 * 30, // 30日
});
```

**推奨事項:**
- APIキーの定期ローテーション
- 最小権限の原則（必要なスコープのみ）
- 使用しないプロバイダーのキーは削除

### 8.2 プロンプトインジェクション対策

**対策:**
```typescript
function sanitizeUserInput(input: string): string {
  // システムプロンプト区切り文字を削除
  return input
    .replace(/```/g, '\\`\\`\\`')
    .replace(/\n---\n/g, '\n\n')
    .slice(0, MAX_INPUT_LENGTH);
}
```

### 8.3 レート制限

**実装:**
```typescript
// ユーザーごとのレート制限（1時間あたり100リクエスト）
const rateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 100,
});

await rateLimiter.checkLimit(`user:${accountId}`);
```

---

## 9. コスト管理

### 9.1 トークン使用量モニタリング

**実装:**
```typescript
// トークン使用量の記録
function recordTokenUsage(
  accountId: string,
  provider: AIProvider,
  inputTokens: number,
  outputTokens: number
) {
  const usage: TokenUsage = {
    date: new Date().toISOString().split('T')[0],
    provider,
    inputTokens,
    outputTokens,
    totalCost: calculateCost(provider, inputTokens, outputTokens),
  };

  const existing = getTokenUsage(accountId, usage.date, usage.date);
  const updated = mergeUsage(existing, usage);
  saveTokenUsage(accountId, updated);
}
```

### 9.2 コスト最適化戦略

1. **モデル選択の最適化**
   - 簡単なタスク（チャット）→ Haiku
   - 複雑なタスク（レビュー）→ Sonnet
   - 最高精度が必要（重要な実装）→ Opus

2. **プロンプトの最適化**
   - システムプロンプトの圧縮
   - 不要なコンテキストの削減
   - 結果のキャッシュ活用

3. **使用量アラート**
   - 月間予算設定
   - 80%到達でアラート
   - 100%到達で一時停止オプション

---

## 10. 将来の拡張計画

### 10.1 追加AI機能

1. **コミットメッセージ生成**
   - 変更差分からメッセージ生成
   - Conventional Commits形式対応

2. **Issue/PRの自動分類**
   - タグ自動提案
   - 優先度自動判定

3. **リポジトリ推薦**
   - 活動履歴からおすすめ表示
   - 類似リポジトリの提案

### 10.2 他AIプロバイダー対応

1. **OpenAI GPT-4**
   - ChatGPT API統合
   - GPT-4 Turbo対応

2. **Google Gemini**
   - Gemini Pro API統合
   - マルチモーダル対応

3. **ローカルLLM**
   - Ollama統合
   - プライバシー重視のユーザー向け

### 10.3 エンタープライズ機能

1. **チーム管理**
   - 組織アカウント
   - 使用量の一元管理
   - コスト配分

2. **監査ログ**
   - AI使用履歴の記録
   - コンプライアンス対応

3. **カスタムプロンプト**
   - 組織固有のレビュー基準
   - プロンプトテンプレート管理

---

## 11. 実装時の注意事項

### 11.1 必須確認事項

- [ ] Anthropic API key取得（開発用）
- [ ] GitHub Copilot APIの正式リリース状況確認
- [ ] Cloudflare Workers AI の利用可否確認
- [ ] 暗号化ライブラリの選定（Web Crypto API推奨）

### 11.2 依存関係

**新規追加パッケージ:**
```json
{
  "@anthropic-ai/sdk": "^0.14.0",
  "marked": "^11.0.0",          // Markdown表示
  "prismjs": "^1.29.0",         // シンタックスハイライト
  "react-markdown": "^9.0.0",   // Reactマークダウン
  "uuid": "^9.0.0"              // セッションID生成
}
```

### 11.3 環境変数

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_CLIENT_ID=...
ANTHROPIC_CLIENT_SECRET=...

# GitHub Copilot（将来）
GITHUB_COPILOT_CLIENT_ID=...
GITHUB_COPILOT_CLIENT_SECRET=...

# 暗号化キー
ENCRYPTION_KEY=...
```

---

## 12. 参考資料

- [Anthropic Claude API Docs](https://docs.anthropic.com/)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

**ドキュメント終了**
