import React from 'react';
import { Repo } from '../types';
import { timeAgo } from '../utils/timeAgo';
import { openExternal } from '../utils/openExternal';

interface RepoCardProps {
  repo: Repo;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo }) => {
  const handleClick = () => {
    openExternal(repo.htmlUrl);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
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
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md motion-safe:transition-shadow motion-reduce:transition-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      {/* Repository Title */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            <span className="text-gray-600">{owner}/</span>
            <span className="text-blue-600">{repoName}</span>
          </h3>
        </div>
        
        {/* Privacy Badge */}
        {repo.isPrivate ? (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            🔒 非公開
          </span>
        ) : (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            🌐 公開
          </span>
        )}
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {repo.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        {/* Primary Language */}
        {repo.primaryLanguage && (
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>{repo.primaryLanguage}</span>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{timeAgo(repo.pushedAt)}</span>
        </div>
      </div>

      {/* Topics */}
      {displayTopics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {displayTopics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
            >
              #{topic}
            </span>
          ))}
          {hasMoreTopics && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
