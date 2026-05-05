/**
 * Workspace - Bottom panel for repository-specific operations
 * Contains tabs for Issues, PRs, TODOs, and AI Commands
 */

import React from 'react';
import { useWorkspace, type WorkspaceTab } from '../contexts/WorkspaceContext';
import { focusRing } from '../lib/focusRing';
import { IssuesTab } from './workspace/IssuesTab';
import { PRsTab } from './workspace/PRsTab';
import { TodosTab } from './workspace/TodosTab';
import { AICommandTab } from './workspace/AICommandTab';

interface WorkspaceTabItem {
  id: WorkspaceTab;
  label: string;
  icon: React.ReactNode;
}

const WORKSPACE_TABS: WorkspaceTabItem[] = [
  {
    id: 'issues',
    label: 'Issues',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
      </svg>
    ),
  },
  {
    id: 'prs',
    label: 'PRs',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    id: 'todos',
    label: 'TODO',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    id: 'ai-command',
    label: 'AI Command',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export const Workspace: React.FC = () => {
  const { selectedRepo, activeTab, setActiveTab, clearSelection } = useWorkspace();

  if (!selectedRepo) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)]">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-body-sm">リポジトリを選択してください</p>
        </div>
      </div>
    );
  }

  // Extract owner and repo name
  const [owner = '', repoName = selectedRepo.nameWithOwner] = selectedRepo.nameWithOwner.split('/');

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
        {/* Repo info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent-green)] font-semibold">{repoName}</span>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-[var(--text-secondary)]">{owner}</span>
          </div>
          {selectedRepo.isPrivate ? (
            <span className="px-2 py-0.5 text-caption bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)] rounded border border-[var(--accent-yellow-border)]">
              Private
            </span>
          ) : (
            <span className="px-2 py-0.5 text-caption bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] rounded border border-[var(--accent-green-border)]">
              Public
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={selectedRepo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              flex items-center gap-1.5 px-3 py-1.5
              text-caption font-medium
              text-[var(--text-secondary)] hover:text-[var(--text-primary)]
              bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]
              border border-[var(--border-subtle)]
              rounded-lg
              transition-colors
              ${focusRing.default}
            `}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>GitHub</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            onClick={clearSelection}
            className={`
              p-1.5
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)]
              rounded-lg
              transition-colors
              ${focusRing.default}
            `}
            aria-label="ワークスペースを閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2
              text-body-sm font-medium
              rounded-lg
              transition-all duration-200
              ${focusRing.default}
              ${
                activeTab === tab.id
                  ? 'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'issues' && (
          <IssuesTab
            owner={owner}
            repo={repoName}
          />
        )}
        {activeTab === 'prs' && (
          <PRsTab
            owner={owner}
            repo={repoName}
          />
        )}
        {activeTab === 'todos' && (
          <TodosTab
            repoId={selectedRepo.id}
            repoName={selectedRepo.nameWithOwner}
          />
        )}
        {activeTab === 'ai-command' && (
          <AICommandTab
            owner={owner}
            repo={repoName}
          />
        )}
      </div>
    </div>
  );
};

export default Workspace;
