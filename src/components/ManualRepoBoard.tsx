import React, { useState, useEffect, useMemo } from 'react';
import { Repo, SortOrder } from '../types';
import { getManualRepos, saveManualRepos, removeManualRepos, clearManualRepos } from '../utils/manualRepoStorage';
import {
  getManualColumnConfig,
  saveManualColumnConfig,
  getManualColumnAssignments,
  saveManualColumnAssignments,
  ManualColumnKey,
  ManualColumnConfig,
} from '../utils/manualColumnStorage';
import { RepoColumn } from './RepoColumn';
import { ColumnSettingsModal } from './ColumnSettingsModal';
import { RepoCard } from './RepoCard';
import { confirmDestructiveAction } from '../utils/confirmDialog';
import { useTagsContext } from '../contexts/TagsContext';
import { searchAndSortRepos } from '../utils/search';
import { TopBar } from './TopBar';

interface ManualRepoBoardProps {
  onStatsUpdate?: (manualRepoCount: number) => void;
  manualRepos?: Repo[];
  onReposChange?: (repos: Repo[]) => void;
}

export const ManualRepoBoard: React.FC<ManualRepoBoardProps> = ({
  onStatsUpdate,
  manualRepos: externalManualRepos,
  onReposChange,
}) => {
  const { getTagObjectsForRepo } = useTagsContext();
  
  // Use external props if provided, otherwise use internal state
  const [internalManualRepos, setInternalManualRepos] = useState<Repo[]>([]);

  const manualRepos = externalManualRepos ?? internalManualRepos;

  const setManualRepos = (repos: Repo[]) => {
    if (onReposChange) {
      onReposChange(repos);
    } else {
      setInternalManualRepos(repos);
    }
  };

  const [columnConfig, setColumnConfig] = useState<ManualColumnConfig>(() =>
    getManualColumnConfig()
  );
  const [columnAssignments, setColumnAssignments] = useState(() =>
    getManualColumnAssignments()
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [orderMap, setOrderMap] = useState<Record<ManualColumnKey, string[]>>({});
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('lastUpdated');

  const persistRemoval = (ids: string[]) => {
    if (!externalManualRepos && ids.length > 0) {
      removeManualRepos(ids);
    }
  };

  const persistClear = () => {
    if (!externalManualRepos) {
      clearManualRepos();
    }
  };

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

  // Load manual repos on mount (only if not controlled by props)
  useEffect(() => {
    if (!externalManualRepos) {
      const repos = getManualRepos();
      setInternalManualRepos(repos);
      onStatsUpdate?.(repos.length);
    }
  }, [externalManualRepos, onStatsUpdate]);

  useEffect(() => {
    onStatsUpdate?.(manualRepos.length);
  }, [manualRepos.length, onStatsUpdate]);

  // Persist changes (only if not controlled by props)
  useEffect(() => {
    if (!externalManualRepos) {
      saveManualRepos(manualRepos);
    }
  }, [manualRepos, externalManualRepos]);

  useEffect(() => {
    saveManualColumnConfig(columnConfig);
  }, [columnConfig]);

  useEffect(() => {
    saveManualColumnAssignments(columnAssignments);
  }, [columnAssignments]);

  useEffect(() => {
    setSelectedRepos((prev) => {
      const validIds = new Set(manualRepos.map((repo) => repo.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [manualRepos]);

  useEffect(() => {
    if (Object.keys(orderMap).length > 0) {
      const newConfig = { ...columnConfig };
      Object.entries(orderMap).forEach(([col, order]) => {
        newConfig.columnOrder[col as ManualColumnKey] = order;
      });
      saveManualColumnConfig(newConfig);
    }
  }, [orderMap]);

  // Filter and sort repos based on search query and sort order
  const filteredRepos = useMemo(() => {
    return searchAndSortRepos(manualRepos, searchQuery, sortOrder, getTagObjectsForRepo);
  }, [manualRepos, searchQuery, sortOrder, getTagObjectsForRepo]);

  // Classify repos by column
  const classifiedRepos = useMemo(() => {
    const result: Record<ManualColumnKey, Repo[]> = {};

    columnConfig.columns.forEach((col) => {
      result[col] = [];
    });

    filteredRepos.forEach((repo) => {
      const assignedCol = columnAssignments[repo.id];
      const column = assignedCol || columnConfig.columns[0];

      if (!result[column]) {
        result[column] = [];
      }
      result[column].push(repo);
    });

    return result;
  }, [filteredRepos, columnAssignments, columnConfig]);

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
    setSelectedRepos((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(manualRepos.map((repo) => repo.id));
    setSelectedRepos(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedRepos(new Set());
  };

  const handleDeleteSelectedRepos = () => {
    if (selectedRepos.size === 0) {
      return;
    }

    const confirmed = confirmDestructiveAction({
      title: `選択した ${selectedRepos.size} 件のリポジトリを削除しますか？`,
      confirmWarning: 'この操作は取り消せません。本当に削除しますか？',
    });
    if (!confirmed) {
      return;
    }

    const ids = Array.from(selectedRepos);
    persistRemoval(ids);
    const updatedRepos = manualRepos.filter((repo) => !selectedRepos.has(repo.id));
    setManualRepos(updatedRepos);
    setSelectedRepos(new Set());
  };

  const handleDeleteRepo = (repoId: string) => {
    const confirmed = confirmDestructiveAction({
      title: 'このリポジトリを削除しますか？',
      confirmWarning: 'この操作は取り消せません。本当に削除しますか？',
    });
    if (!confirmed) {
      return;
    }

    persistRemoval([repoId]);
    const updatedRepos = manualRepos.filter((repo) => repo.id !== repoId);
    setManualRepos(updatedRepos);
    setSelectedRepos((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(repoId);
      return next;
    });
  };

  const handleToggleDeleteMode = () => {
    setIsDeleteMode((prev) => !prev);
    // 削除モードをオフにする時は選択をクリア
    if (isDeleteMode) {
      setSelectedRepos(new Set());
    }
  };

  const handleClearAll = () => {
    const confirmed = confirmDestructiveAction({
      title: `すべてのリポジトリ（${manualRepos.length} 件）を削除しますか？`,
      confirmWarning: 'この操作は取り消せません。本当にすべてのリポジトリを削除しますか？',
    });
    if (!confirmed) {
      return;
    }

    persistClear();
    const updatedRepos: Repo[] = [];
    setManualRepos(updatedRepos);
    setSelectedRepos(new Set());
    setIsDeleteMode(false);
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
            <h2 className="text-title-1 font-bold text-[var(--text-primary)] mb-2">
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

  // Calculate filtered count for display
  const filteredCount = Object.values(classifiedRepos).reduce(
    (sum, columnRepos) => sum + columnRepos.length,
    0
  );

  return (
    <div className="h-screen flex flex-col bg-surface-app transition-colors">
      {/* TopBar with Search and Sort */}
      <TopBar
        title={`追加したリポジトリ (${manualRepos.length})`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        totalRepos={manualRepos.length}
        filteredCount={filteredCount}
        onOpenColumnSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Additional Toolbar for ManualRepoBoard specific actions */}
      {manualRepos.length > 0 && (
        <div className="flex items-center justify-end px-8 py-2 bg-surface-primary border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleDeleteMode}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-body-sm border ${
                isDeleteMode
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300'
                  : 'bg-[var(--accent-red-muted)] text-[var(--accent-red-emphasis)] hover:bg-[var(--accent-red-hover)] border-[var(--accent-red-border)]'
              }`}
              title={isDeleteMode ? '削除操作を終了' : '削除操作を開始'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              削除操作
            </button>
            {isDeleteMode && selectedRepos.size === manualRepos.length && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium text-body-sm border border-red-300"
                title="すべてのリポジトリを削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                すべてクリア
              </button>
            )}
          </div>
        </div>
      )}

      {/* Board Columns */}
      <div className="flex-1 flex gap-inline-lg p-inset-md overflow-x-auto relative">
        {columnConfig.columns.map((columnKey) => (
          <RepoColumn
            key={columnKey}
            title={columnConfig.columnTitles[columnKey]}
            repos={getOrderedRepos(columnKey)}
            columnKey={columnKey}
            onReorder={handleReorderWithinColumn}
            onReorderBetween={handleReorderBetween}
            onTitleChange={handleColumnTitleChange}
            renderRepoCard={(repo) => (
              <div key={repo.id} className="animate-fade-in">
                <RepoCard
                  repo={repo}
                  columnKey={columnKey}
                  showCheckbox={isDeleteMode}
                  showDeleteButton={isDeleteMode}
                  isSelected={selectedRepos.has(repo.id)}
                  onSelect={handleToggleRepoSelection}
                  onDelete={handleDeleteRepo}
                />
              </div>
            )}
          />
        ))}

        {/* Floating Action Bar */}
        {selectedRepos.size > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-surface-primary border-2 border-[var(--accent-green-border)] rounded-xl shadow-2xl px-inset-lg py-stack-sm flex items-center gap-inline-lg animate-fade-in">
            <div className="flex items-center gap-inline-sm text-[var(--accent-green-emphasis)] font-semibold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{selectedRepos.size}件選択中</span>
            </div>
            <div className="h-6 w-px bg-[var(--border-subtle)]" />
            <button
              onClick={handleSelectAll}
              className="px-inset-md py-stack-xs rounded-lg bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] hover:bg-[var(--accent-blue-hover)] transition-colors font-medium text-body-sm border border-[var(--accent-blue-border)]"
            >
              すべて選択
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-inset-md py-stack-xs rounded-lg bg-surface-tertiary text-[var(--text-primary)] hover:bg-surface-hover transition-colors font-medium text-body-sm border border-[var(--border-subtle)]"
            >
              選択解除
            </button>
            <button
              onClick={handleDeleteSelectedRepos}
              className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium text-body-sm"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                削除
              </span>
            </button>
          </div>
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
