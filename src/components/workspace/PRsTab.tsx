/**
 * PRsTab - GitHub Pull Requests management tab for workspace
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchPullRequests, type GitHubPullRequest } from '../../api/issues';
import { focusRing } from '../../lib/focusRing';
import { timeAgo } from '../../lib/timeAgo';

interface PRsTabProps {
  owner: string;
  repo: string;
  onPRSelect?: (pr: GitHubPullRequest) => void;
}

type PRFilter = 'open' | 'closed' | 'all';

export const PRsTab: React.FC<PRsTabProps> = ({
  owner,
  repo,
  onPRSelect,
}) => {
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PRFilter>('open');

  const loadPRs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchPullRequests(owner, repo, {
        state: filter,
        per_page: 30,
        sort: 'updated',
        direction: 'desc',
      });
      setPullRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pull requests');
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, filter]);

  useEffect(() => {
    loadPRs();
  }, [loadPRs]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">Pull Requests</h3>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
            <button
              onClick={() => setFilter('open')}
              className={`
                px-3 py-1.5 rounded-md text-body-sm font-medium transition-all
                ${filter === 'open'
                  ? 'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              Open {filter === 'open' && `(${pullRequests.length})`}
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`
                px-3 py-1.5 rounded-md text-body-sm font-medium transition-all
                ${filter === 'closed'
                  ? 'bg-[var(--accent-purple-muted)] text-[var(--accent-purple-emphasis)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              Closed {filter === 'closed' && `(${pullRequests.length})`}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`
                px-3 py-1.5 rounded-md text-body-sm font-medium transition-all
                ${filter === 'all'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPRs}
            disabled={isLoading}
            className={`
              p-2 rounded-lg
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)]
              transition-colors
              disabled:opacity-50
              ${focusRing.default}
            `}
            title="更新"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)] mx-auto mb-3" />
              <p className="text-body-sm text-[var(--text-muted)]">Loading pull requests...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center max-w-md">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-[var(--accent-red)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-body-sm text-[var(--accent-red-emphasis)] mb-4">{error}</p>
              <button
                onClick={loadPRs}
                className={`
                  px-4 py-2 rounded-lg
                  bg-[var(--accent-blue)] text-white
                  hover:bg-[var(--accent-blue-emphasis)]
                  transition-colors
                  ${focusRing.default}
                `}
              >
                Retry
              </button>
            </div>
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-30 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-body-sm text-[var(--text-muted)] mb-2">
                {filter === 'open' ? 'No open pull requests' : filter === 'closed' ? 'No closed pull requests' : 'No pull requests'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {pullRequests.map((pr) => (
              <PRRow
                key={pr.id}
                pr={pr}
                onClick={() => onPRSelect?.(pr)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PRRowProps {
  pr: GitHubPullRequest;
  onClick?: () => void;
}

const PRRow: React.FC<PRRowProps> = ({ pr, onClick }) => {
  // Determine PR status
  const getStatusInfo = () => {
    if (pr.merged_at) {
      return {
        icon: (
          <svg className="w-5 h-5 text-[var(--accent-purple)]" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          </svg>
        ),
        label: 'Merged',
        color: 'text-[var(--accent-purple)]',
      };
    }
    if (pr.state === 'closed') {
      return {
        icon: (
          <svg className="w-5 h-5 text-[var(--accent-red)]" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          </svg>
        ),
        label: 'Closed',
        color: 'text-[var(--accent-red)]',
      };
    }
    if (pr.draft) {
      return {
        icon: (
          <svg className="w-5 h-5 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M2.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.25 1a2.25 2.25 0 00-.75 4.372v5.256a2.251 2.251 0 101.5 0V5.372A2.25 2.25 0 003.25 1zm0 11a.75.75 0 100 1.5.75.75 0 000-1.5zm9.5 3a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zm0-3a.75.75 0 100 1.5.75.75 0 000-1.5z" />
            <path d="M14 7.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm0-4.25a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z" />
          </svg>
        ),
        label: 'Draft',
        color: 'text-[var(--text-muted)]',
      };
    }
    return {
      icon: (
        <svg className="w-5 h-5 text-[var(--accent-green)]" fill="currentColor" viewBox="0 0 16 16">
          <path fillRule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
        </svg>
      ),
      label: 'Open',
      color: 'text-[var(--accent-green)]',
    };
  };

  const status = getStatusInfo();

  return (
    <a
      href={pr.html_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        block w-full text-left px-4 py-3
        hover:bg-[var(--bg-hover)]
        transition-colors
        ${focusRing.default}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {status.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-body-sm font-medium text-[var(--text-primary)] truncate">
              {pr.title}
            </span>
            {pr.draft && (
              <span className="px-2 py-0.5 rounded-full text-caption bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                Draft
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-caption text-[var(--text-muted)]">
            <span>#{pr.number}</span>
            <span className="flex items-center gap-1">
              <span className="text-[var(--text-tertiary)]">{pr.head.ref}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-[var(--text-tertiary)]">{pr.base.ref}</span>
            </span>
            <span>opened {timeAgo(pr.created_at)}</span>
          </div>

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {pr.labels.slice(0, 4).map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-full text-caption font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {pr.labels.length > 4 && (
                <span className="text-caption text-[var(--text-muted)]">
                  +{pr.labels.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* User & Assignees */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <img
            src={pr.user.avatar_url}
            alt={pr.user.login}
            className="w-6 h-6 rounded-full"
            title={`Created by ${pr.user.login}`}
          />
          {pr.assignees.length > 0 && (
            <div className="flex -space-x-2">
              {pr.assignees.slice(0, 2).map((assignee) => (
                <img
                  key={assignee.login}
                  src={assignee.avatar_url}
                  alt={assignee.login}
                  className="w-5 h-5 rounded-full border-2 border-[var(--bg-primary)]"
                  title={assignee.login}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
};

export default PRsTab;

