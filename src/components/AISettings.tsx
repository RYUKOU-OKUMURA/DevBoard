/**
 * AI Settings Component (MVP)
 *
 * Simplified AI settings interface for Claude configuration.
 * Handles API key management, model selection, and connection testing.
 */

import React, { useState, useEffect } from 'react';
import { GlassModal } from './ui/GlassModal';
import { useAI } from '../hooks/useAI';
import { useAuth } from '../contexts/AuthContext';
import { CLAUDE_MODELS, type AIConfig, type AIProvider } from '../types/ai';
import { validateAPIKeyFormat, maskAPIKey } from '../utils/encryption';
import { calculateTotalUsage, getCurrentMonthRange } from '../utils/aiStorage';
import { focusRing } from '../lib/focusRing';

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const accountId = user?.userId || 'anonymous';

  // State
  const [provider] = useState<AIProvider>('claude'); // MVP: Only Claude
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<string>('claude-3-5-sonnet-20241022');
  const [enabled, setEnabled] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [tokenUsage, setTokenUsage] = useState({ inputTokens: 0, outputTokens: 0, totalCost: 0 });

  const { config, updateConfig, testConnection } = useAI(provider, accountId);

  // Load existing configuration
  useEffect(() => {
    if (config) {
      setApiKey(config.apiKey || '');
      setModel(config.model || 'claude-3-5-sonnet-20241022');
      setEnabled(config.enabled);
    }
  }, [config]);

  // Load token usage
  useEffect(() => {
    if (isOpen) {
      loadTokenUsage();
    }
  }, [isOpen, accountId]);

  const loadTokenUsage = async () => {
    try {
      const { startDate, endDate } = getCurrentMonthRange();
      const usage = await calculateTotalUsage(accountId, provider, startDate, endDate);
      setTokenUsage(usage);
    } catch (error) {
      console.error('Failed to load token usage:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      // Validate API key format
      if (apiKey && !validateAPIKeyFormat(apiKey, provider)) {
        throw new Error('Invalid API key format. Claude keys should start with "sk-ant-"');
      }

      const newConfig: AIConfig = {
        provider,
        authType: apiKey ? 'api-key' : 'subscription',
        apiKey: apiKey || undefined,
        model,
        enabled,
      };

      await updateConfig(newConfig);
      setTestStatus('idle');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setErrorMessage('');

    try {
      const success = await testConnection();
      setTestStatus(success ? 'success' : 'error');

      if (!success) {
        setErrorMessage('Connection test failed. Please check your API key.');
      }
    } catch (error) {
      setTestStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Connection test failed');
    }
  };

  const displayApiKey = apiKey ? (showApiKey ? apiKey : maskAPIKey(apiKey)) : '';

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="AI設定" tone="dark">
      <div className="space-y-stack-lg">
        {/* Provider Section */}
        <div className="rounded-2xl border border-white/10 bg-surface-subtle/50 p-inset-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-stack-md">
            <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">Claude</h3>
            <label className="flex items-center gap-inline-sm cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className={`h-5 w-5 rounded border-2 border-white/20 bg-surface-primary/50
                  checked:bg-brand-purple checked:border-brand-purple transition-colors
                  ${focusRing.default} ${focusRing.brand}`}
              />
              <span className="text-body text-[var(--text-secondary)]">有効化</span>
            </label>
          </div>

          {/* API Key Input */}
          <div className="space-y-stack-sm">
            <label htmlFor="apiKey" className="block text-body-sm font-medium text-[var(--text-secondary)]">
              APIキー
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={displayApiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className={`w-full rounded-xl border border-white/10 bg-surface-primary/50 px-inset-md py-inset-sm
                  text-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                  transition-colors hover:border-white/20 focus:border-brand-purple focus:outline-none
                  ${focusRing.default} ${focusRing.brand}`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]
                  hover:text-[var(--text-secondary)] transition-colors ${focusRing.default} ${focusRing.brand}
                  rounded-lg p-1`}
                aria-label={showApiKey ? 'APIキーを隠す' : 'APIキーを表示'}
              >
                {showApiKey ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-caption text-[var(--text-muted)]">
              Claude APIキーは{' '}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-purple hover:underline"
              >
                Anthropic Console
              </a>
              {' '}で取得できます
            </p>
          </div>

          {/* Model Selection */}
          <div className="mt-stack-md space-y-stack-sm">
            <label htmlFor="model" className="block text-body-sm font-medium text-[var(--text-secondary)]">
              モデル
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`w-full rounded-xl border border-white/10 bg-surface-primary/50 px-inset-md py-inset-sm
                text-body text-[var(--text-primary)] transition-colors hover:border-white/20
                focus:border-brand-purple focus:outline-none ${focusRing.default} ${focusRing.brand}`}
            >
              {Object.entries(CLAUDE_MODELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Test Connection Button */}
          <div className="mt-stack-md">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={!apiKey || testStatus === 'testing'}
              className={`w-full rounded-xl px-inset-lg py-inset-md text-body font-medium
                transition-all duration-200 ${focusRing.default} ${focusRing.brand}
                ${
                  testStatus === 'success'
                    ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                    : testStatus === 'error'
                    ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                    : 'bg-surface-primary/70 border border-white/10 text-[var(--text-secondary)] hover:border-white/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {testStatus === 'testing' && '接続テスト中...'}
              {testStatus === 'success' && '✓ 接続成功'}
              {testStatus === 'error' && '✗ 接続失敗'}
              {testStatus === 'idle' && 'テスト接続'}
            </button>
          </div>
        </div>

        {/* Token Usage */}
        <div className="rounded-2xl border border-white/10 bg-surface-subtle/50 p-inset-lg backdrop-blur-sm">
          <h3 className="text-title-3 font-semibold text-[var(--text-primary)] mb-stack-md">
            トークン使用量 (今月)
          </h3>
          <div className="space-y-stack-sm text-body text-[var(--text-secondary)]">
            <div className="flex justify-between">
              <span>入力トークン:</span>
              <span className="font-mono">{tokenUsage.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>出力トークン:</span>
              <span className="font-mono">{tokenUsage.outputTokens.toLocaleString()}</span>
            </div>
            {tokenUsage.totalCost > 0 && (
              <div className="flex justify-between border-t border-white/10 pt-stack-sm">
                <span>推定コスト:</span>
                <span className="font-mono">${tokenUsage.totalCost.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-inset-md">
            <p className="text-body-sm text-red-300">{errorMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-inline-md justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-inset-lg py-inset-md text-body font-medium
              bg-surface-primary/70 border border-white/10 text-[var(--text-secondary)]
              hover:border-white/20 transition-all duration-200 ${focusRing.default} ${focusRing.brand}`}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`rounded-xl px-inset-lg py-inset-md text-body font-medium
              bg-brand-purple border border-brand-purple/40 text-white
              hover:bg-brand-purple/90 transition-all duration-200 ${focusRing.default} ${focusRing.brand}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
