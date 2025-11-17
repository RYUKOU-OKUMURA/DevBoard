/**
 * useAI Custom Hook
 *
 * Provides AI functionality including chat, configuration management, and token tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import type { AIProvider, AIConfig, AIChatResponse, AIError, ClaudeModel } from '../types/ai';
import { aiStorage } from '../utils/aiStorage';

interface UseAIResult {
  config: AIConfig | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string, context?: string) => Promise<string>;
  updateConfig: (config: AIConfig) => Promise<void>;
  testConnection: () => Promise<boolean>;
}

/**
 * Custom hook for AI functionality
 *
 * @param provider - The AI provider to use ('claude' or 'copilot')
 * @param accountId - The account ID for storage
 * @returns AI functionality interface
 */
export function useAI(provider: AIProvider, accountId: string): UseAIResult {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await aiStorage.getConfig(accountId, provider);
        setConfig(savedConfig);
      } catch (err) {
        console.error('Failed to load AI config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      }
    };

    loadConfig();
  }, [provider, accountId]);

  /**
   * Send a chat message to the AI
   */
  const sendMessage = useCallback(
    async (message: string, context?: string): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!config) {
          throw new Error('AI not configured. Please set up your API key in settings.');
        }

        if (!config.enabled) {
          throw new Error(`${provider} is not enabled. Please enable it in settings.`);
        }

        // Prepare request body
        const requestBody = {
          provider,
          message,
          context,
          model: config.model as ClaudeModel,
          apiKey: config.apiKey, // Will be sent if user is using their own API key
        };

        // Call API endpoint
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData: { error: AIError } = await response.json();
          throw new Error(errorData.error.message || 'Failed to get AI response');
        }

        const data: AIChatResponse = await response.json();

        // Record token usage
        const today = new Date().toISOString().split('T')[0];
        await aiStorage.recordTokenUsage(accountId, {
          date: today,
          provider,
          inputTokens: data.tokenUsage.inputTokens,
          outputTokens: data.tokenUsage.outputTokens,
          totalCost: calculateCost(
            config.model || 'claude-3-5-sonnet-20241022',
            data.tokenUsage.inputTokens,
            data.tokenUsage.outputTokens
          ),
        });

        return data.reply;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [config, provider, accountId]
  );

  /**
   * Update AI configuration
   */
  const updateConfig = useCallback(
    async (newConfig: AIConfig): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await aiStorage.saveConfig(accountId, provider, newConfig);
        setConfig(newConfig);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [provider, accountId]
  );

  /**
   * Test API connection
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!config) {
        throw new Error('AI not configured');
      }

      // Send a simple test message
      await sendMessage('Hello, this is a test message. Please respond with "OK".');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config, sendMessage]);

  return {
    config,
    isLoading,
    error,
    sendMessage,
    updateConfig,
    testConnection,
  };
}

/**
 * Calculate cost based on model and token usage
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet-20241022': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    'claude-3-opus-20240229': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
    'claude-3-haiku-20240307': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
  };

  const modelPricing = pricing[model];
  if (!modelPricing) {
    return 0;
  }

  return inputTokens * modelPricing.input + outputTokens * modelPricing.output;
}

/**
 * Estimate token count from text
 * Simple approximation: 1 token ≈ 4 characters (English), 1 token ≈ 2 characters (Japanese)
 */
export function estimateTokens(text: string): number {
  const japaneseChars = (text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
  const otherChars = text.length - japaneseChars;
  return Math.ceil(japaneseChars / 2 + otherChars / 4);
}

/**
 * Estimate cost for a message before sending
 */
export function estimateCost(model: string, message: string, context?: string): number {
  const totalText = message + (context || '');
  const estimatedInputTokens = estimateTokens(totalText);
  const estimatedOutputTokens = 1000; // Assume average response

  return calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
}
