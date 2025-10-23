// Type definitions for Cloudflare Workers Functions

export interface Env {
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
}

export interface SessionData {
  userId: string;
  username: string;
  accessToken: string;
  createdAt: number;
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
