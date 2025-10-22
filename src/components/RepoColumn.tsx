import React from 'react';
import { Repo, ColumnKey } from '../types';
import { RepoCard } from './RepoCard';

interface RepoColumnProps {
  title: string;
  repos: Repo[];
  columnKey: ColumnKey;
}

const COLUMN_COLORS: Record<ColumnKey, { bg: string; border: string; header: string }> = {
  Active: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    header: 'bg-green-100 text-green-800',
  },
  Stale: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    header: 'bg-yellow-100 text-yellow-800',
  },
  Dormant: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    header: 'bg-orange-100 text-orange-800',
  },
  Archived: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    header: 'bg-gray-100 text-gray-800',
  },
};

export const RepoColumn: React.FC<RepoColumnProps> = ({
  title,
  repos,
  columnKey,
}) => {
  const colors = COLUMN_COLORS[columnKey];

  return (
    <div className="flex-1 min-w-[320px] flex flex-col">
      {/* Column Header */}
      <div
        className={`${colors.header} px-4 py-3 rounded-t-lg font-semibold flex items-center justify-between shadow-sm`}
      >
        <span>{title}</span>
        <span className="bg-white bg-opacity-50 px-2 py-1 rounded text-sm">
          {repos.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        className={`${colors.bg} ${colors.border} border-2 border-t-0 rounded-b-lg flex-1 overflow-y-auto p-3 space-y-3`}
      >
        {repos.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p>No repositories</p>
            </div>
          </div>
        ) : (
          repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))
        )}
      </div>
    </div>
  );
};
