/**
 * AI Storage Utilities
 *
 * Handles localStorage-based storage for AI configurations, chat sessions, and token usage.
 * Designed with an adapter pattern to allow future migration to Cloudflare KV.
 */

import type { AIConfig, AIProvider, AIChatSession, TokenUsage } from '../types/ai';
import { encryptAPIKey, decryptAPIKey } from './encryption';

// Storage keys
const STORAGE_KEYS = {
  aiConfig: (accountId: string) => `github-dashboard-ai-config:${accountId}`,
  aiSessions: (accountId: string) => `github-dashboard-ai-sessions:${accountId}`,
  tokenUsage: (accountId: string) => `github-dashboard-ai-token-usage:${accountId}`,
} as const;

// Constants
const MAX_SESSIONS = 50; // Keep only the latest 50 sessions
const MAX_USAGE_DAYS = 90; // Keep only the last 90 days of usage data

/**
 * Storage Adapter Interface
 * Allows for future migration to different storage backends (KV, D1, etc.)
 */
export interface AIStorageAdapter {
  getConfig(accountId: string, provider: AIProvider): Promise<AIConfig | null>;
  saveConfig(accountId: string, provider: AIProvider, config: AIConfig): Promise<void>;
  getSessions(accountId: string, limit?: number): Promise<AIChatSession[]>;
  saveSession(accountId: string, session: AIChatSession): Promise<void>;
  deleteSession(accountId: string, sessionId: string): Promise<void>;
  getTokenUsage(accountId: string, startDate: string, endDate: string): Promise<TokenUsage[]>;
  recordTokenUsage(accountId: string, usage: TokenUsage): Promise<void>;
}

/**
 * LocalStorage implementation of AIStorageAdapter
 */
class LocalStorageAdapter implements AIStorageAdapter {
  /**
   * Get AI configuration for a specific provider
   */
  async getConfig(accountId: string, provider: AIProvider): Promise<AIConfig | null> {
    try {
      const key = STORAGE_KEYS.aiConfig(accountId);
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      const configs: Record<AIProvider, AIConfig> = JSON.parse(data);
      const config = configs[provider];

      if (!config) {
        return null;
      }

      // Decrypt API key if present
      if (config.apiKey) {
        config.apiKey = await decryptAPIKey(config.apiKey, accountId);
      }

      return config;
    } catch (error) {
      console.error('Failed to get AI config:', error);
      return null;
    }
  }

  /**
   * Save AI configuration for a specific provider
   */
  async saveConfig(accountId: string, provider: AIProvider, config: AIConfig): Promise<void> {
    try {
      const key = STORAGE_KEYS.aiConfig(accountId);
      const existingData = localStorage.getItem(key);
      const configs: Record<string, AIConfig> = existingData ? JSON.parse(existingData) : {};

      // Encrypt API key if present
      const configToSave = { ...config };
      if (configToSave.apiKey) {
        configToSave.apiKey = await encryptAPIKey(configToSave.apiKey, accountId);
      }

      configs[provider] = configToSave;
      localStorage.setItem(key, JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save AI config:', error);
      throw new Error('Failed to save AI configuration');
    }
  }

  /**
   * Get chat sessions for an account
   */
  async getSessions(accountId: string, limit: number = MAX_SESSIONS): Promise<AIChatSession[]> {
    try {
      const key = STORAGE_KEYS.aiSessions(accountId);
      const data = localStorage.getItem(key);

      if (!data) {
        return [];
      }

      const sessions: AIChatSession[] = JSON.parse(data);

      // Sort by updatedAt descending and apply limit
      return sessions
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Save a chat session
   */
  async saveSession(accountId: string, session: AIChatSession): Promise<void> {
    try {
      const key = STORAGE_KEYS.aiSessions(accountId);
      const existingSessions = await this.getSessions(accountId, MAX_SESSIONS);

      // Update or add session
      const sessionIndex = existingSessions.findIndex(s => s.id === session.id);
      if (sessionIndex >= 0) {
        existingSessions[sessionIndex] = session;
      } else {
        existingSessions.unshift(session);
      }

      // Keep only MAX_SESSIONS
      const sessionsToSave = existingSessions.slice(0, MAX_SESSIONS);

      localStorage.setItem(key, JSON.stringify(sessionsToSave));
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error('Failed to save chat session');
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(accountId: string, sessionId: string): Promise<void> {
    try {
      const key = STORAGE_KEYS.aiSessions(accountId);
      const sessions = await this.getSessions(accountId, MAX_SESSIONS);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);

      localStorage.setItem(key, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error('Failed to delete chat session');
    }
  }

  /**
   * Get token usage within a date range
   */
  async getTokenUsage(accountId: string, startDate: string, endDate: string): Promise<TokenUsage[]> {
    try {
      const key = STORAGE_KEYS.tokenUsage(accountId);
      const data = localStorage.getItem(key);

      if (!data) {
        return [];
      }

      const allUsage: TokenUsage[] = JSON.parse(data);

      // Filter by date range
      return allUsage.filter(usage => {
        return usage.date >= startDate && usage.date <= endDate;
      });
    } catch (error) {
      console.error('Failed to get token usage:', error);
      return [];
    }
  }

  /**
   * Record token usage for a day
   */
  async recordTokenUsage(accountId: string, usage: TokenUsage): Promise<void> {
    try {
      const key = STORAGE_KEYS.tokenUsage(accountId);
      const existingData = localStorage.getItem(key);
      const allUsage: TokenUsage[] = existingData ? JSON.parse(existingData) : [];

      // Find existing usage for the same date and provider
      const existingIndex = allUsage.findIndex(
        u => u.date === usage.date && u.provider === usage.provider
      );

      if (existingIndex >= 0) {
        // Merge with existing usage
        allUsage[existingIndex].inputTokens += usage.inputTokens;
        allUsage[existingIndex].outputTokens += usage.outputTokens;
        if (usage.totalCost) {
          allUsage[existingIndex].totalCost = (allUsage[existingIndex].totalCost || 0) + usage.totalCost;
        }
      } else {
        allUsage.push(usage);
      }

      // Clean up old usage data (keep only last MAX_USAGE_DAYS)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_USAGE_DAYS);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const filteredUsage = allUsage.filter(u => u.date >= cutoffDateStr);

      localStorage.setItem(key, JSON.stringify(filteredUsage));
    } catch (error) {
      console.error('Failed to record token usage:', error);
      throw new Error('Failed to record token usage');
    }
  }
}

// Export singleton instance
export const aiStorage: AIStorageAdapter = new LocalStorageAdapter();

/**
 * Helper functions for common operations
 */

/**
 * Get all AI configurations for an account
 */
export async function getAllConfigs(accountId: string): Promise<Record<AIProvider, AIConfig | null>> {
  const providers: AIProvider[] = ['claude', 'copilot'];
  const configs: Record<string, AIConfig | null> = {};

  for (const provider of providers) {
    configs[provider] = await aiStorage.getConfig(accountId, provider);
  }

  return configs as Record<AIProvider, AIConfig | null>;
}

/**
 * Calculate total token usage for a provider within a date range
 */
export async function calculateTotalUsage(
  accountId: string,
  provider: AIProvider,
  startDate: string,
  endDate: string
): Promise<{ inputTokens: number; outputTokens: number; totalCost: number }> {
  const usage = await aiStorage.getTokenUsage(accountId, startDate, endDate);
  const providerUsage = usage.filter(u => u.provider === provider);

  return providerUsage.reduce(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      totalCost: acc.totalCost + (u.totalCost || 0),
    }),
    { inputTokens: 0, outputTokens: 0, totalCost: 0 }
  );
}

/**
 * Get current month's date range
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];

  return { startDate, endDate };
}
