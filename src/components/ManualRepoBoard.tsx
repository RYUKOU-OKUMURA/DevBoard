import React, { useState, useEffect, useMemo } from 'react';
import { Repo } from '../types';
import {
  getManualRepos,
  saveManualRepos,
  removeManualRepos,
  getManualRepoCount,
} from '../utils/manualRepoStorage';
import {
  getManualColumnConfig,
  saveManualColumnConfig,
  getManualColumnAssignments,
  saveManualColumnAssignments,
  ManualColumnKey,
  ManualColumnConfig,
  assignRepoToColumn,
  getReposInColumn,
} from '../utils/manualColumnStorage';
import { RepoColumn } from './RepoColumn';
import { ColumnSettingsModal } from './ColumnSettingsModal';
import { RepoCard } from './RepoCard';

interface ManualRepoBoardProps {
  onStatsUpdate?: (manualRepoCount: number) => void;
}

export const ManualRepoBoard: React.FC<ManualRepoBoardProps> = ({ onStatsUpdate }) => {
  const [manualRepos, setManualRepos] = useState<Repo[]>([]);
  const [columnConfig, setColumnConfig] = useState<ManualColumnConfig>(() =>
    getManualColumnConfig()
  );
  const [columnAssignments, setColumnAssignments] = useState(() =>
    getManualColumnAssignments()
  );
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [orderMap, setOrderMap] = useState<Record<ManualColumnKey, string[]>>({});

  // Initialize orderMap from columnConfig
  useEffect(() => {
    setOrderMap(
      columnConfig.columns.reduce(
        (acc, col) => ({
          ...acc,
          [col]: columnConfig.columnOrder[col] || [],
        }),
        {}
      )
    );
  }, [columnConfig]);

  // Load manual repos on mount
  useEffect(() => {
    const repos = getManualRepos();
    setManualRepos(repos);
    if (onStatsUpdate) {
      onStatsUpdate(repos.length);
    }
  }, [onStatsUpdate]);

  // Persist changes
  useEffect(() => {
    saveManualRepos(manualRepos);
  }, [manualRepos]);

  useEffect(() => {
    saveManualColumnConfig(columnConfig);
  }, [columnConfig]);

  useEffect(() => {
    saveManualColumnAssignments(columnAssignments);
  }, [columnAssignments]);

  useEffect(() => {
    if (Object.keys(orderMap).length > 0) {
      const newConfig = { ...columnConfig };
      Object.entries(orderMap).forEach(([col, order]) => {
        newConfig.columnOrder[col as ManualColumnKey] = order;
      });
      saveManualColumnConfig(newConfig);
    }
  }, [orderMap]);

  // Classify repos by column
  const classifiedRepos = useMemo(() => {
    const result: Record<ManualColumnKey, Repo[]> = {};

    columnConfig.columns.forEach((col) => {
      result[col] = [];
    });

    manualRepos.forEach((repo) => {
      const assignedCol = columnAssignments[repo.id];
      const column = assignedCol || columnConfig.columns[0];

      if (!result[column]) {
        result[column] = [];
      }
      result[column].push(repo);
    });

    return result;
  }, [manualRepos, columnAssignments, columnConfig]);

  // Get ordered repos for a column
  const getOrderedRepos = (col: ManualColumnKey): Repo[] => {
    const idOrder = orderMap[col] || [];
    const map = new Map(classifiedRepos[col].map((r) => [r.id, r] as const));
    const ordered: Repo[] = [];

    idOrder.forEach((id) => {
      const r = map.get(id);
      if (r) ordered.push(r);
    });

    classifiedRepos[col].forEach((r) => {
      if (!idOrder.includes(r.id)) ordered.push(r);
    });

    return ordered;
  };

  // Handlers
  const handleToggleRepoSelection = (repoId: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const handleDeleteSelectedRepos = () => {
    if (selectedRepos.size === 0 || !window.confirm('選択したリポジトリを削除しますか？')) {
      return;
    }

    removeManualRepos(Array.from(selectedRepos));
    setManualRepos(getManualRepos());
    setSelectedRepos(new Set());
  };

  const handleDeleteRepo = (repoId: string) => {
    if (!window.confirm('このリポジトリを削除しますか？')) {
      return;
    }

    removeManualRepos([repoId]);
    setManualRepos(getManualRepos());
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      next.delete(repoId);
      return next;
    });
  };

  const handleReorderWithinColumn = (col: ManualColumnKey, fromId: string, toId?: string) => {
    setOrderMap((prev) => {
      const list = [...(prev[col] || [])];
      const fromIdx = list.indexOf(fromId);
      if (fromIdx === -1) return prev;

      list.splice(fromIdx, 1);

      if (toId) {
        const toIdx = list.indexOf(toId);
        const insertIdx = toIdx === -1 ? list.length : toIdx;
        list.splice(insertIdx, 0, fromId);
      } else {
        list.push(fromId);
      }

      return { ...prev, [col]: list };
    });
  };

  const handleReorderBetween = (
    fromCol: ManualColumnKey,
    toCol: ManualColumnKey,
    fromId: string,
    toId?: string
  ) => {
    if (fromCol === toCol) {
      handleReorderWithinColumn(fromCol, fromId, toId);
      return;
    }

    // Update assignment
    setColumnAssignments((prev) => ({
      ...prev,
      [fromId]: toCol,
    }));

    // Update order maps
    setOrderMap((prev) => {
      const fromList = [...(prev[fromCol] || [])].filter((id) => id !== fromId);
      const toListRaw = prev[toCol] || [];
      const toList = toListRaw.filter((id) => id !== fromId);

      if (toId) {
        const targetIdx = toList.indexOf(toId);
        const insertIdx = targetIdx === -1 ? toList.length : targetIdx;
        toList.splice(insertIdx, 0, fromId);
      } else {
        toList.push(fromId);
      }

      return {
        ...prev,
        [fromCol]: fromList,
        [toCol]: toList,
      };
    });
  };

  const handleUpdateColumnConfig = (newConfig: ManualColumnConfig) => {
    setColumnConfig(newConfig);
    // Update orderMap to include new columns
    setOrderMap((prev) => {
      const updated = { ...prev };
      newConfig.columns.forEach((col) => {
        if (!(col in updated)) {
          updated[col] = [];
        }
      });
      // Remove deleted columns
      Object.keys(updated).forEach((col) => {
        if (!newConfig.columns.includes(col as ManualColumnKey)) {
          delete updated[col as ManualColumnKey];
        }
      });
      return updated;
    });
  };

  const handleToggleColumnVisibility = (columnKey: ManualColumnKey) => {
    setColumnConfig((prev) => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        [columnKey]: !prev.columnVisibility[columnKey],
      },
    }));
  };

  const handleColumnTitleChange = (col: ManualColumnKey, newTitle: string) => {
    setColumnConfig((prev) => ({
      ...prev,
      columnTitles: {
        ...prev.columnTitles,
        [col]: newTitle.trim(),
      },
    }));
  };

  if (manualRepos.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-surface-app transition-colors">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <svg
                className="w-16 h-16 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m0 0h6m-18 0a9 9 0 1118 0 9 9 0 01-18 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              リポジトリはまだ追加されていません
            </h2>
            <p className="text-[var(--text-muted)] mb-6">
              「カンバン」タブでリポジトリを追加すると、ここに表示されます
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-app transition-colors">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-8 py-4 bg-surface-primary border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            追加したリポジトリ ({manualRepos.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {selectedRepos.size > 0 && (
            <button
              onClick={handleDeleteSelectedRepos}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {selectedRepos.size}件を削除
            </button>
          )}

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] hover:bg-[var(--accent-blue-hover)] transition-colors font-medium text-sm border border-[var(--accent-blue-border)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            列の管理
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {columnConfig.columns.map((columnKey) =>
          columnConfig.columnVisibility[columnKey] ? (
            <RepoColumn
              key={columnKey}
              title={columnConfig.columnTitles[columnKey]}
              repos={getOrderedRepos(columnKey)}
              columnKey={columnKey as any}
              onReorder={handleReorderWithinColumn}
              onReorderBetween={handleReorderBetween}
              onTitleChange={handleColumnTitleChange}
              isVisible={columnConfig.columnVisibility[columnKey]}
              onToggleVisibility={handleToggleColumnVisibility}
              renderRepoCard={(repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  showCheckbox={true}
                  showDeleteButton={true}
                  isSelected={selectedRepos.has(repo.id)}
                  onSelect={handleToggleRepoSelection}
                  onDelete={handleDeleteRepo}
                />
              )}
            />
          ) : null
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <ColumnSettingsModal
          config={columnConfig}
          onSave={handleUpdateColumnConfig}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};

