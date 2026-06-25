// Type definitions for Cloudflare Workers Functions

// Maximum number of accounts that can be logged in simultaneously
export const MAX_ACCOUNTS = 5;

export interface Env {
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS?: string;
  GITHUB_REDIRECT_URI?: string;
  // ローカル開発時のみレート制限を緩和するためのフラグ。
  // .dev.vars に LOCAL_DEV=true を設定すると wrangler pages dev でレート制限が実質無効になる。
  LOCAL_DEV?: string;
}

export interface SessionData {
  userId: string;
  username: string;
  accessToken: string;
  createdAt: number;
}

// Account metadata stored for multi-account support
export interface AccountMetadata {
  userId: string;
  username: string;
  createdAt: number;
}

// Multi-account session container
export interface MultiAccountSession {
  accounts: AccountMetadata[];
  activeUserId: string;
  lastUpdated: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

// OAuth session data stored in KV during OAuth flow
export interface OAuthSessionData {
  state: string;
  codeVerifier: string;
  sessionId: string;
  createdAt: number;
}
