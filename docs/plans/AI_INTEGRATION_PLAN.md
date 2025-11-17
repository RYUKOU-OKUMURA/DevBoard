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

#### 2.2.1 ストレージオプション比較

| 項目 | localStorage | Cloudflare KV | Cloudflare D1 | Durable Objects |
|------|-------------|---------------|---------------|-----------------|
| **容量制限** | ~5MB | 実質無制限 | 実質無制限 | 実質無制限 |
| **同期** | なし（端末固有） | グローバル | グローバル | グローバル |
| **一貫性** | 即座 | 結果整合性 | 強整合性 | 強整合性 |
| **コスト** | 無料 | 読み$0.50/1M、書き$5/1M | Alpha（無料） | $0.15/1M req |
| **複雑度** | 低 | 低 | 中 | 高 |
| **オフライン** | ○ | × | × | × |
| **適用** | MVP、設定 | セッション履歴 | 将来（複雑クエリ） | 将来（トランザクション） |

#### 2.2.2 MVP ストレージ戦略

**Phase 1 (MVP):**
- **AI設定**: `localStorage`（暗号化）
  - キー: `github-dashboard-ai-config:{accountId}`
  - 値: `Record<AIProvider, AIConfig>`
  - 理由: 小容量、高速アクセス、オフライン対応

- **チャットセッション**: `localStorage` + 将来的に KV 移行
  - キー: `github-dashboard-ai-sessions:{accountId}`
  - 値: `AIChatSession[]`（最新50セッションのみ）
  - アーカイブ戦略: 30日以上古いセッションは自動削除

- **トークン使用量**: `localStorage`
  - キー: `github-dashboard-ai-token-usage:{accountId}`
  - 値: `TokenUsage[]`（直近90日分）

**Phase 2 (Post-MVP):**
- **チャットセッション**: Cloudflare KV に移行
  - 複数端末での同期
  - セッション数の上限撤廃
  - バックアップと復元機能

**容量見積もり:**
```typescript
// AI設定: ~500B × 2プロバイダー = ~1KB
// セッション1件: ~2KB（メッセージ10件想定）
// セッション50件: ~100KB
// トークン使用量90日: ~10KB
// 合計: ~111KB（5MB制限に対して十分余裕あり）
```

#### 2.2.3 ストレージキー設計

**キー:**
- `github-dashboard-ai-config:{accountId}` → `Record<AIProvider, AIConfig>`
- `github-dashboard-ai-sessions:{accountId}` → `AIChatSession[]`
- `github-dashboard-ai-token-usage:{accountId}` → `TokenUsage[]`

**セキュリティ考慮:**
- APIキーは AES-256-GCM で暗号化して localStorage に保存
- 暗号化鍵は accountId + ブラウザ固有値から導出（PBKDF2）
- または、Cloudflare Workers Secrets に保存（サブスクリプション連携時）

#### 2.2.4 移行インターフェース設計

将来的な KV/D1 移行に備え、ストレージアクセスを抽象化：

```typescript
// src/utils/aiStorage.ts
interface AIStorageAdapter {
  getConfig(accountId: string, provider: AIProvider): Promise<AIConfig | null>;
  saveConfig(accountId: string, provider: AIProvider, config: AIConfig): Promise<void>;
  getSessions(accountId: string, limit?: number): Promise<AIChatSession[]>;
  saveSession(accountId: string, session: AIChatSession): Promise<void>;
  getTokenUsage(accountId: string, startDate: string, endDate: string): Promise<TokenUsage[]>;
  recordTokenUsage(accountId: string, usage: TokenUsage): Promise<void>;
}

// MVP実装: LocalStorage adapter
class LocalStorageAdapter implements AIStorageAdapter { ... }

// 将来: KV adapter
class CloudflareKVAdapter implements AIStorageAdapter { ... }
```

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

### 2.5 コンテキスト制御設計

#### 2.5.1 トークン管理戦略

**トークン制限:**
```typescript
const TOKEN_LIMITS = {
  claude: {
    'claude-3-5-sonnet-20241022': { input: 200_000, output: 4_096 },
    'claude-3-opus-20240229': { input: 200_000, output: 4_096 },
    'claude-3-haiku-20240307': { input: 200_000, output: 4_096 },
  },
  copilot: {
    default: { input: 8_000, output: 2_048 }, // GPT-4ベース想定
  },
} as const;
```

**トークン推定:**
```typescript
// src/utils/tokenEstimator.ts
function estimateTokens(text: string): number {
  // 簡易推定: 1トークン ≒ 4文字（英語）、1トークン ≒ 2文字（日本語）
  const japaneseChars = (text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
  const otherChars = text.length - japaneseChars;
  return Math.ceil(japaneseChars / 2 + otherChars / 4);
}

function canFitInContext(
  systemPrompt: string,
  userInput: string,
  context: string,
  provider: AIProvider,
  model: string
): boolean {
  const total = estimateTokens(systemPrompt) + estimateTokens(userInput) + estimateTokens(context);
  const limit = TOKEN_LIMITS[provider][model]?.input || 8000;
  return total < limit * 0.9; // 安全マージン10%
}
```

#### 2.5.2 動的コンテキストウィンドウ

Issue/PR の内容が長い場合、優先順位に基づいて動的に削減：

**優先順位:**
1. **必須**: ユーザーの直接入力、Issue/PRタイトル
2. **高**: Issue/PR本文（最初の500文字）、コードの差分（変更行のみ）
3. **中**: リポジトリ説明、Issue/PRラベル
4. **低**: コメント、レビュー履歴

**実装:**
```typescript
function buildOptimalContext(
  repo: Repo,
  issue?: Issue,
  pr?: PullRequest,
  maxTokens: number = 50_000
): string {
  const parts: Array<{ priority: number; content: string; tokens: number }> = [
    { priority: 1, content: `リポジトリ: ${repo.nameWithOwner}`, tokens: estimateTokens(repo.nameWithOwner) },
    { priority: 3, content: `説明: ${repo.description}`, tokens: estimateTokens(repo.description || '') },
    // ... 他のパーツ
  ];

  // トークン制限内に収まるまで低優先度から削除
  parts.sort((a, b) => b.priority - a.priority);
  let total = 0;
  const selected: string[] = [];

  for (const part of parts) {
    if (total + part.tokens <= maxTokens) {
      selected.push(part.content);
      total += part.tokens;
    }
  }

  return selected.join('\n\n');
}
```

#### 2.5.3 コスト見積もりと警告

**実装:**
```typescript
// src/utils/costEstimator.ts
const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-3-opus-20240229': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  'claude-3-haiku-20240307': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
} as const;

function estimateCost(model: string, inputTokens: number, outputTokens: number = 1000): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

// UIで表示
function showCostWarning(estimatedCost: number) {
  if (estimatedCost > 0.1) {
    return `⚠️ この操作は約 $${estimatedCost.toFixed(3)} のコストが発生します。続行しますか？`;
  }
  return null;
}
```

#### 2.5.4 ストリーミング対応

Claude/OpenAI API はストリーミングをサポートしているため、長い応答を逐次表示：

**実装:**
```typescript
// functions/api/ai/chat-stream.ts
export async function onRequest(context) {
  const { request, env } = context;
  const { provider, message, sessionId } = await request.json();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // SSE形式でストリーミング
  anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{ role: 'user', content: message }],
  }).on('text', (text) => {
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
  }).on('end', () => {
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 2.6 プロバイダー管理戦略

#### 2.6.1 フォールバック設計

GitHub Copilot API が未提供または利用不可の場合の対応：

**Phase 1 (MVP):**
- **Claude のみ実装**: Copilot は UI に表示するが「準備中」ステータス
- **エラーメッセージ**:
  ```
  GitHub Copilot API は現在ベータ版です。
  正式リリースまで Claude をご利用ください。
  ```

**Phase 2 (Copilot 利用可能後):**
- Copilot API 統合
- プロバイダー切り替え機能

**フォールバックロジック:**
```typescript
async function sendAIMessage(
  provider: AIProvider,
  message: string,
  fallbackProvider?: AIProvider
): Promise<string> {
  try {
    if (provider === 'copilot' && !isCopilotAvailable()) {
      throw new Error('Copilot API not available');
    }
    return await callAI(provider, message);
  } catch (error) {
    if (fallbackProvider && error.message.includes('not available')) {
      console.warn(`Falling back to ${fallbackProvider}`);
      return await callAI(fallbackProvider, message);
    }
    throw error;
  }
}
```

#### 2.6.2 プロバイダー切り替えUI

**自動切り替え:**
- Copilot 選択時に利用不可な場合、自動で Claude に切り替え
- ユーザーに通知トースト表示

**手動切り替え:**
- 設定画面で「優先プロバイダー」を選択
- チャットパネルでタブ切り替え可能

#### 2.6.3 プロバイダー別機能制限

| 機能 | Claude | Copilot (将来) |
|------|--------|----------------|
| チャット | ✅ | ✅ |
| Issue実装提案 | ✅ | ✅ |
| PRレビュー | ✅ | ✅ |
| コード生成 | ✅ | ✅（推奨） |
| 長文コンテキスト | ✅（200K） | ⚠️（8K想定） |
| ストリーミング | ✅ | ✅ |
| 日本語対応 | ✅ | ✅ |

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

#### 8.1.1 暗号化仕様

**使用アルゴリズム:**
- **暗号化**: AES-256-GCM（Web Crypto API）
- **鍵導出**: PBKDF2（100,000 iterations）
- **ソルト**: accountId + ブラウザ固有値（crypto.randomUUID）

**実装:**
```typescript
// src/utils/encryption.ts
import { webcrypto } from 'crypto';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100_000;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAPIKey(apiKey: string, accountId: string): Promise<string> {
  const encoder = new TextEncoder();

  // ソルトとIVを生成
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 鍵を導出
  const key = await deriveKey(accountId, salt);

  // 暗号化
  const encrypted = await webcrypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(apiKey)
  );

  // salt + iv + encrypted を Base64 エンコード
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptAPIKey(encrypted: string, accountId: string): Promise<string> {
  const decoder = new TextDecoder();

  // Base64 デコード
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

  // salt, iv, encrypted を分離
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // 鍵を導出
  const key = await deriveKey(accountId, salt);

  // 復号化
  const decrypted = await webcrypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return decoder.decode(decrypted);
}
```

#### 8.1.2 保存方式の比較

| 方式 | セキュリティ | 利便性 | 多端末対応 | 推奨用途 |
|------|------------|--------|-----------|---------|
| **暗号化localStorage** | ⚠️ 中 | ✅ 高 | ❌ なし | MVP、開発用 |
| **Cloudflare Workers Secrets** | ✅ 高 | ⚠️ 中 | ✅ あり | サブスク連携時 |
| **プロキシAPI（キー非保存）** | ✅ 最高 | ✅ 高 | ✅ あり | 本番推奨 |

**MVP 実装方針:**
- **個人APIキー**: 暗号化して localStorage に保存
- **サブスクリプション**: Workers Secrets でサーバー側管理

**本番推奨アーキテクチャ（Phase 2）:**
```
ユーザー → Cloudflare Workers → Claude/Copilot API
             ↑ Secrets にキー保存
             ↑ accountId で使用量管理
```
ユーザーは API キーを直接持たず、Workers がプロキシとして動作。

#### 8.1.3 APIキー管理ベストプラクティス

**実装必須:**
- [ ] APIキーの表示は `*****` でマスク
- [ ] 「テスト接続」機能で有効性を検証
- [ ] 無効なキーの場合、即座にエラー表示
- [ ] 定期ローテーション推奨の通知（90日ごと）

**OAuth スコープ（サブスクリプション連携時）:**
- Anthropic: `api` スコープのみ（最小権限）
- GitHub（Copilot用）: `copilot` スコープのみ

**推奨事項:**
- APIキーの定期ローテーション（90日）
- 最小権限の原則（必要なスコープのみ）
- 使用しないプロバイダーのキーは削除
- 開発環境と本番環境で異なるキーを使用

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

### 8.4 外部API依存管理

#### 8.4.1 レート制限管理

**Claude API 制限:**
- **Tier 1（新規）**: 50 RPM, 40,000 TPM, 200,000 TPD
- **Tier 2**: 1,000 RPM, 80,000 TPM, 1,000,000 TPD
- **Tier 3**: 2,000 RPM, 160,000 TPM, 2,000,000 TPD

**実装:**
```typescript
// src/utils/rateLimiter.ts
class APIRateLimiter {
  private requests: Map<string, number[]> = new Map();

  async checkLimit(accountId: string, provider: AIProvider): Promise<boolean> {
    const key = `${accountId}:${provider}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1分

    // 古いリクエストを削除
    const recent = (this.requests.get(key) || []).filter(t => now - t < windowMs);

    // 制限チェック
    const limits = {
      claude: 50, // Tier 1
      copilot: 60, // 仮定
    };

    if (recent.length >= limits[provider]) {
      const oldestRequest = recent[0];
      const waitMs = windowMs - (now - oldestRequest);
      throw new RateLimitError(`Rate limit exceeded. Retry after ${Math.ceil(waitMs / 1000)}s`);
    }

    // リクエスト記録
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}
```

**UIフィードバック:**
```typescript
// レート制限エラー時の表示
if (error instanceof RateLimitError) {
  showToast({
    type: 'warning',
    title: 'レート制限',
    message: `APIリクエスト制限に達しました。${error.retryAfter}秒後に再試行してください。`,
  });
}
```

#### 8.4.2 エラーハンドリングとリトライ戦略

**エラー分類:**
```typescript
type APIError =
  | { code: 400; type: 'invalid_request'; message: string }
  | { code: 401; type: 'authentication_error'; message: string }
  | { code: 429; type: 'rate_limit_error'; retryAfter: number }
  | { code: 500; type: 'api_error'; message: string }
  | { code: 503; type: 'service_unavailable'; retryAfter?: number }
  | { code: 'NETWORK_ERROR'; type: 'network_error'; message: string };
```

**リトライロジック:**
```typescript
async function callAIWithRetry(
  provider: AIProvider,
  message: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callAI(provider, message);
    } catch (error) {
      lastError = error;

      // リトライしないエラー
      if (error.code === 400 || error.code === 401) {
        throw error;
      }

      // レート制限
      if (error.code === 429) {
        const delay = error.retryAfter * 1000 || (attempt + 1) * 2000;
        await sleep(delay);
        continue;
      }

      // サーバーエラー（指数バックオフ）
      if (error.code === 500 || error.code === 503) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delay);
        continue;
      }

      // ネットワークエラー
      if (error.code === 'NETWORK_ERROR') {
        const delay = (attempt + 1) * 1000;
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}
```

#### 8.4.3 タイムアウト管理

**実装:**
```typescript
async function callAIWithTimeout(
  provider: AIProvider,
  message: string,
  timeoutMs: number = 30_000
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ provider, message }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}
```

#### 8.4.4 API可用性監視

**ヘルスチェック:**
```typescript
// functions/api/ai/health.ts
export async function onRequest(context) {
  const { env } = context;

  const health = {
    claude: await checkClaudeHealth(env.ANTHROPIC_API_KEY),
    copilot: await checkCopilotHealth(), // 将来
    timestamp: new Date().toISOString(),
  };

  return Response.json(health);
}

async function checkClaudeHealth(apiKey: string): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // 最小モデル
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }],
    });
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return { status: 'error', latency: -1 };
  }
}
```

**UIステータス表示:**
```typescript
// 設定画面にステータス表示
<div className="api-status">
  <StatusBadge status={claudeHealth.status} label="Claude API" />
  <StatusBadge status={copilotHealth.status} label="Copilot API" />
</div>
```

#### 8.4.5 フォールバック実装詳細

**優先順位付きフォールバック:**
```typescript
const AI_PROVIDERS_PRIORITY: AIProvider[] = ['claude', 'copilot']; // 優先順

async function sendMessageWithFallback(message: string): Promise<string> {
  const errors: Array<{ provider: AIProvider; error: Error }> = [];

  for (const provider of AI_PROVIDERS_PRIORITY) {
    try {
      const config = await getAIConfig(currentAccount.id, provider);
      if (!config?.enabled) continue;

      return await callAI(provider, message);
    } catch (error) {
      errors.push({ provider, error });
      console.warn(`${provider} failed, trying next provider...`, error);
    }
  }

  // すべて失敗
  throw new Error(
    `All AI providers failed:\n${errors.map(e => `- ${e.provider}: ${e.error.message}`).join('\n')}`
  );
}
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

## 12. MVPスコープ定義

### 12.1 3層スコープ分離

#### 🎯 MVP (Phase 1) - 8-10時間

**目標**: Claude統合の基本機能を最速でリリース

**含まれる機能:**
- ✅ Claude API 統合（Claudeのみ、Copilotは除外）
- ✅ 基本チャット機能（シンプルなUI）
- ✅ AI設定画面（APIキー入力、モデル選択）
- ✅ 暗号化された localStorage ストレージ
- ✅ トークン使用量の基本表示

**実装フェーズ:**
- フェーズ1: 基盤構築（簡略版）- 2-3h
  - 型定義、ストレージ（localStorage のみ）、暗号化
  - `/api/ai/chat` エンドポイント（Claude のみ）
- フェーズ2: AI設定UI（簡略版）- 1.5-2h
  - APIキー入力フォーム
  - モデル選択（Claude 3モデルのみ）
  - テスト接続機能
- フェーズ3: 基本チャットパネル - 3-4h
  - チャット入力・表示
  - マークダウン対応
  - セッション保存（最新10件のみ）
- フェーズ7（部分）: 基本テスト - 1.5-2h
  - エラーハンドリング
  - 基本的な動作確認

**除外する機能（V1.1以降）:**
- ❌ GitHub Copilot 統合
- ❌ Issue/PR統合
- ❌ コンテキスト自動注入
- ❌ サブスクリプション連携
- ❌ ストリーミング応答
- ❌ RepoCard アクション
- ❌ 高度なプロンプト最適化

**成功基準:**
- [ ] Claudeとチャットできる
- [ ] APIキーを安全に保存できる
- [ ] チャット履歴が保存される
- [ ] トークン使用量が表示される

#### 🚀 V1.1 (Phase 2) - 6-8時間

**目標**: Issue/PR統合とコンテキスト機能の追加

**追加機能:**
- ✅ Issue実装提案機能
- ✅ PRレビュー機能
- ✅ コンテキスト自動注入
- ✅ RepoCard アクションメニュー
- ✅ ストリーミング応答対応
- ✅ トークン最適化

**実装フェーズ:**
- フェーズ4: Issue/PR統合 - 3-4h
- フェーズ5: プロンプト最適化 - 2-3h
- 追加: ストリーミング対応 - 1h

**成功基準:**
- [ ] Issueから実装提案を取得できる
- [ ] PRのコードレビューができる
- [ ] リポジトリコンテキストが自動注入される

#### 🌟 V2.0 (Phase 3) - 7-10時間

**目標**: Copilot統合とエンタープライズ機能

**追加機能:**
- ✅ GitHub Copilot API 統合
- ✅ サブスクリプション連携（Claude + Copilot）
- ✅ Cloudflare KV によるセッション同期
- ✅ 高度なコスト管理
- ✅ 組織アカウント対応（将来）

**実装フェーズ:**
- フェーズ6: サブスクリプション連携 - 3-4h
- 追加: Copilot API 統合 - 2-3h
- 追加: KV ストレージ移行 - 2-3h

**成功基準:**
- [ ] Copilot が利用可能
- [ ] サブスクアカウントで認証できる
- [ ] 複数端末でセッションが同期される

### 12.2 MVP時間見積もり調整

**元の見積もり**: 19-26時間（全7フェーズ）

**MVP見積もり**: 8-10時間（3フェーズ + 部分的Phase 7）

**削減内容:**
- Copilot統合: -2h
- Issue/PR統合: -3~4h → V1.1へ
- プロンプト最適化: -2~3h → V1.1へ
- サブスク連携: -3~4h → V2.0へ
- 高度なテスト: -1h → V1.1/V2.0へ

### 12.3 段階的リリース計画

**Week 1-2: MVP開発**
- Claude統合のみで基本機能を実装
- 内部テスト・フィードバック収集

**Week 3-4: V1.1開発**
- Issue/PR統合追加
- 実際の開発ワークフローで利用開始

**Week 5+: V2.0開発**
- Copilot API がリリースされたタイミングで統合
- サブスクリプション機能の追加

### 12.4 優先順位付けマトリクス

| 機能 | 価値 | 複雑度 | 依存性 | 優先度 |
|------|-----|-------|--------|--------|
| Claude チャット | 高 | 低 | なし | **MVP** |
| API設定UI | 高 | 低 | なし | **MVP** |
| セッション保存 | 中 | 低 | なし | **MVP** |
| Issue実装提案 | 高 | 中 | MVP | **V1.1** |
| PRレビュー | 高 | 中 | MVP | **V1.1** |
| コンテキスト注入 | 中 | 中 | MVP | **V1.1** |
| Copilot統合 | 中 | 高 | API未公開 | **V2.0** |
| サブスク連携 | 低 | 高 | OAuth | **V2.0** |
| KV同期 | 低 | 中 | V1.1 | **V2.0** |

---

## 13. 参考資料

- [Anthropic Claude API Docs](https://docs.anthropic.com/)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [PBKDF2 Key Derivation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)

---

**ドキュメント終了**
