import React from 'react';
import { Repo } from '../types';
import { timeAgo } from '../lib/timeAgo';

interface RepoCardProps {
  repo: Repo;
  onHide?: (repoId: string) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onHide }) => {
  const handleClick = () => {
    window.open(repo.htmlUrl, '_blank', 'noopener,noreferrer');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onHide) {
      onHide(repo.id);
    }
  };

  // Extract owner and repo name
  const [owner, repoName] = repo.nameWithOwner.split('/');

  // Get max 3 topics
  const displayTopics = repo.topics.slice(0, 3);
  const hasMoreTopics = repo.topics.length > 3;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`リポジトリを開く ${repo.nameWithOwner}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-green-600 motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
    >
      {/* Repository Title and Actions */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            <span className="text-gray-600">{owner}/</span>
            <span className="text-green-600">{repoName}</span>
          </h3>
        </div>

        <div className="flex items-center gap-1 ml-2">
          {/* Privacy Badge */}
          {repo.isPrivate ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
              Private
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              Public
            </span>
          )}

          {/* Hide Button */}
          {onHide && (
            <button
              onClick={handleHideClick}
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              title="非表示にする"
              aria-label="このカードを非表示にする"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {repo.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-sm text-gray-600 mb-2 flex-wrap">
        {/* Primary Language */}
        {repo.primaryLanguage && (
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>{repo.primaryLanguage}</span>
          </div>
        )}

        {/* Stars */}
        {repo.stargazerCount !== undefined && repo.stargazerCount > 0 && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <svg
              className="w-3.5 h-3.5 text-yellow-500"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
              viewBox="0 0 24 24"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{repo.stargazerCount}</span>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
          <span>{timeAgo(repo.pushedAt)}</span>
        </div>
      </div>

      {/* Topics */}
      {displayTopics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayTopics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
            >
              #{topic}
            </span>
          ))}
          {hasMoreTopics && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
