/**
 * AICommandTab - AI Agent command interface for workspace
 * Allows sending commands to @Codex or @Claude Code via GitHub Issue comments
 */

import React, { useState, useCallback, useEffect } from 'react';
import { addIssueComment, fetchIssues, type GitHubIssue } from '../../api/issues';
import { focusRing } from '../../lib/focusRing';

interface AICommandTabProps {
  owner: string;
  repo: string;
}

type AIAgent = 'codex' | 'claude-code';

interface CommandTemplate {
  id: string;
  label: string;
  template: string;
  description: string;
}

const AI_AGENTS: { id: AIAgent; label: string; mention: string; color: string }[] = [
  { id: 'codex', label: 'Codex', mention: '@codex-cli', color: 'var(--accent-green)' },
  { id: 'claude-code', label: 'Claude Code', mention: '@claude-code-agent', color: 'var(--accent-purple)' },
];

const COMMAND_TEMPLATES: CommandTemplate[] = [
  {
    id: 'fix-bug',
    label: 'バグ修正',
    template: 'このIssueで報告されたバグを修正してください。',
    description: 'Issue内容に基づいてバグを修正',
  },
  {
    id: 'implement-feature',
    label: '機能実装',
    template: 'このIssueで説明されている機能を実装してください。',
    description: 'Issue内容に基づいて機能を実装',
  },
  {
    id: 'refactor',
    label: 'リファクタリング',
    template: 'このIssueで指摘されたコードをリファクタリングしてください。',
    description: 'コードの品質改善',
  },
  {
    id: 'add-tests',
    label: 'テスト追加',
    template: '該当するコードにテストを追加してください。',
    description: 'ユニットテスト/統合テストの追加',
  },
  {
    id: 'review',
    label: 'コードレビュー',
    template: 'このIssueに関連するコードをレビューして、改善点を提案してください。',
    description: 'コードレビューと提案',
  },
  {
    id: 'custom',
    label: 'カスタム',
    template: '',
    description: '自由にコマンドを入力',
  },
];

export const AICommandTab: React.FC<AICommandTabProps> = ({
  owner,
  repo,
}) => {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent>('codex');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('fix-bug');
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<Array<{
    id: string;
    agent: AIAgent;
    issueNumber: number;
    command: string;
    timestamp: Date;
  }>>([]);

  // Load open issues
  useEffect(() => {
    const loadIssues = async () => {
      setIsLoading(true);
      try {
        const data = await fetchIssues(owner, repo, {
          state: 'open',
          per_page: 50,
        });
        setIssues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load issues');
      } finally {
        setIsLoading(false);
      }
    };
    loadIssues();
  }, [owner, repo]);

  // Update command when template changes
  useEffect(() => {
    const template = COMMAND_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template && template.template) {
      setCommand(template.template);
    }
  }, [selectedTemplate]);

  const handleSendCommand = useCallback(async () => {
    if (!selectedIssue || !command.trim()) return;

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const agent = AI_AGENTS.find(a => a.id === selectedAgent);
      const fullCommand = `${agent?.mention} ${command.trim()}`;

      await addIssueComment(owner, repo, selectedIssue.number, fullCommand);

      // Add to history
      setCommandHistory(prev => [{
        id: `${Date.now()}`,
        agent: selectedAgent,
        issueNumber: selectedIssue.number,
        command: command.trim(),
        timestamp: new Date(),
      }, ...prev.slice(0, 9)]); // Keep last 10

      setSuccessMessage(`Issue #${selectedIssue.number} にコマンドを送信しました`);
      setCommand('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send command');
    } finally {
      setIsSending(false);
    }
  }, [selectedIssue, selectedAgent, command, owner, repo]);

  const selectedAgentInfo = AI_AGENTS.find(a => a.id === selectedAgent);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">AI Command</h3>
          <span className="text-body-sm text-[var(--text-muted)]">
            GitHub Issue経由でAIエージェントにコマンドを送信
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Agent Selection */}
          <div>
            <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
              AIエージェント
            </label>
            <div className="flex gap-3">
              {AI_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`
                    flex-1 px-4 py-3 rounded-lg
                    border-2 transition-all
                    ${selectedAgent === agent.id
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green-muted)]'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-primary)]'
                    }
                    ${focusRing.default}
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className={`text-body-sm font-medium ${
                      selectedAgent === agent.id
                        ? 'text-[var(--accent-green-emphasis)]'
                        : 'text-[var(--text-primary)]'
                    }`}>
                      {agent.label}
                    </span>
                  </div>
                  <div className="text-caption text-[var(--text-muted)] mt-1">
                    {agent.mention}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Issue Selection */}
          <div>
            <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
              対象Issue
            </label>
            {isLoading ? (
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-blue)] mx-auto" />
              </div>
            ) : issues.length === 0 ? (
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg text-center text-[var(--text-muted)]">
                オープンなIssueがありません
              </div>
            ) : (
              <select
                value={selectedIssue?.number || ''}
                onChange={(e) => {
                  const issue = issues.find(i => i.number === Number(e.target.value));
                  setSelectedIssue(issue || null);
                }}
                className={`
                  w-full px-3 py-2
                  border border-[var(--border-subtle)]
                  rounded-lg
                  bg-[var(--bg-primary)]
                  text-[var(--text-primary)]
                  ${focusRing.default}
                `}
              >
                <option value="">Issueを選択...</option>
                {issues.map((issue) => (
                  <option key={issue.number} value={issue.number}>
                    #{issue.number} - {issue.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
              コマンドテンプレート
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COMMAND_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`
                    px-3 py-2 rounded-lg text-left
                    border transition-all
                    ${selectedTemplate === template.id
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green-muted)]'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-primary)]'
                    }
                    ${focusRing.default}
                  `}
                >
                  <div className={`text-body-sm font-medium ${
                    selectedTemplate === template.id
                      ? 'text-[var(--accent-green-emphasis)]'
                      : 'text-[var(--text-primary)]'
                  }`}>
                    {template.label}
                  </div>
                  <div className="text-caption text-[var(--text-muted)]">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Command Input */}
          <div>
            <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
              コマンド
            </label>
            <div className="relative">
              <div className="absolute left-3 top-3 text-body-sm font-medium" style={{ color: selectedAgentInfo?.color }}>
                {selectedAgentInfo?.mention}
              </div>
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="AIエージェントへのコマンドを入力..."
                rows={4}
                className={`
                  w-full pl-3 pt-8 pr-3 pb-3
                  border border-[var(--border-subtle)]
                  rounded-lg
                  bg-[var(--bg-primary)]
                  text-[var(--text-primary)]
                  placeholder:text-[var(--text-muted)]
                  resize-none
                  ${focusRing.default}
                `}
              />
            </div>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div className="p-3 bg-[var(--accent-red-muted)] border border-[var(--accent-red-border)] rounded-lg text-body-sm text-[var(--accent-red-emphasis)]">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-[var(--accent-green-muted)] border border-[var(--accent-green-border)] rounded-lg text-body-sm text-[var(--accent-green-emphasis)]">
              ✓ {successMessage}
            </div>
          )}

          {/* Send Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSendCommand}
              disabled={!selectedIssue || !command.trim() || isSending}
              className={`
                flex items-center gap-2 px-6 py-2.5
                rounded-lg font-medium
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${focusRing.default}
              `}
              style={{
                background: selectedAgentInfo?.color,
                color: 'white',
              }}
            >
              {isSending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>コマンドを送信</span>
                </>
              )}
            </button>
          </div>

          {/* Command History */}
          {commandHistory.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] pt-6">
              <h4 className="text-body-sm font-medium text-[var(--text-primary)] mb-3">
                送信履歴
              </h4>
              <div className="space-y-2">
                {commandHistory.map((item) => {
                  const agent = AI_AGENTS.find(a => a.id === item.agent);
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: agent?.color }}
                          />
                          <span className="text-caption font-medium text-[var(--text-secondary)]">
                            {agent?.label}
                          </span>
                          <span className="text-caption text-[var(--text-muted)]">
                            → Issue #{item.issueNumber}
                          </span>
                        </div>
                        <span className="text-caption text-[var(--text-muted)]">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-body-sm text-[var(--text-primary)] truncate">
                        {item.command}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  return `${Math.floor(hours / 24)}日前`;
}

export default AICommandTab;

