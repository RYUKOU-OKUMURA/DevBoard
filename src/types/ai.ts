/**
 * AI Integration Type Definitions
 *
 * This file contains all type definitions for AI assistant functionality,
 * including Claude and future GitHub Copilot integration.
 */

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
  apiKey?: string;              // API キー (authType が 'api-key' の場合)
  model?: string;               // 使用モデル (例: "claude-3-5-sonnet-20241022")
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
  totalCost?: number;           // USD (APIキー使用時)
};

/**
 * AI API レスポンス
 */
export type AIChatResponse = {
  reply: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
};

/**
 * AI API エラー
 */
export type AIError = {
  code: 400 | 401 | 429 | 500 | 503 | 'NETWORK_ERROR';
  type: 'invalid_request' | 'authentication_error' | 'rate_limit_error' | 'api_error' | 'service_unavailable' | 'network_error';
  message: string;
  retryAfter?: number;
};

/**
 * Available Claude Models
 */
export const CLAUDE_MODELS = {
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (推奨)',
  'claude-3-opus-20240229': 'Claude 3 Opus (最高精度)',
  'claude-3-haiku-20240307': 'Claude 3 Haiku (高速)',
} as const;

export type ClaudeModel = keyof typeof CLAUDE_MODELS;

/**
 * Token Limits per Model
 */
export const TOKEN_LIMITS = {
  claude: {
    'claude-3-5-sonnet-20241022': { input: 200_000, output: 4_096 },
    'claude-3-opus-20240229': { input: 200_000, output: 4_096 },
    'claude-3-haiku-20240307': { input: 200_000, output: 4_096 },
  },
  copilot: {
    default: { input: 8_000, output: 2_048 },
  },
} as const;

/**
 * Pricing per Model (USD per million tokens)
 */
export const PRICING = {
  'claude-3-5-sonnet-20241022': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-3-opus-20240229': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  'claude-3-haiku-20240307': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
} as const;
