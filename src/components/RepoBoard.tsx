import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Repo, ColumnKey, SortOrder, AppConfig, ViewPreset, ViewMode } from '../types';
import { classifyRepo, DEFAULT_CLASSIFY_CONFIG, configToOptions } from '../lib/classifyRepo';
import { searchAndSortRepos } from '../utils/search';
import { getPresets, savePreset, deletePreset, getPresetById, createPresetSnapshot } from '../utils/presetStorage';
import { RepoColumn } from './RepoColumn';
import { RepoGrid } from './RepoGrid';
import { RepoList } from './RepoList';
import { TopBar } from './TopBar';
import { MainColumnSettingsModal } from './MainColumnSettingsModal';
import { useAuth } from '../contexts/AuthContext';
import { useTagsContext } from '../contexts/TagsContext';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { devWarn } from '../utils/logger';

interface RepoBoardProps {
  repos: Repo[];
  config?: AppConfig;
  isLoading?: boolean;
  onRefresh?: () => void;
  onStatsUpdate?: (totalVisible: number, categoryCounts: Record<ColumnKey, number>, columnTitles: Record<ColumnKey, string>) => void;
  lastUpdateTime?: number | null;
}

const COLUMN_TITLES: Record<ColumnKey, string> = {
  Active: 'アクティブ',
  Stale: '停滞',
  Dormant: '休眠',
  Archived: 'アーカイブ',
};

const COLUMN_ORDER: ColumnKey[] = ['Active', 'Stale', 'Dormant', 'Archived'];

const ORDER_STORAGE_KEY = 'github-dashboard-column-order';
const COLUMN_TITLES_STORAGE_KEY = 'github-dashboard-column-titles';
const COLUMN_ASSIGNMENTS_STORAGE_KEY = 'github-dashboard-column-assignments';
const HIDDEN_REPOS_STORAGE_KEY = 'github-dashboard-hidden-repos';
const COLUMN_DISPLAY_ORDER_KEY = 'github-dashboard-column-display-order';
const VIEW_MODE_STORAGE_KEY = 'github-dashboard-view-mode';

export const RepoBoard: React.FC<RepoBoardProps> = ({
  repos,
  config = DEFAULT_CLASSIFY_CONFIG,
  isLoading = false,
  onRefresh,
  onStatsUpdate,
  lastUpdateTime,
}) => {
  const { user } = useAuth(); // Get current user for account-scoped presets
  const { getTagObjectsForRepo } = useTagsContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('lastUpdated');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return getStorageItem<ViewMode>(VIEW_MODE_STORAGE_KEY, 'kanban');
    } catch {
      return 'kanban';
    }
  });

  // Preset management
  const [presets, setPresets] = useState<ViewPreset[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string>('');

  // Dynamic thresholds
  const [thresholds, setThresholds] = useState({
    activeThreshold: DEFAULT_CLASSIFY_CONFIG.activeThreshold,
    staleThreshold: DEFAULT_CLASSIFY_CONFIG.staleThreshold,
  });

  const [columnTitles, setColumnTitles] = useState<Record<ColumnKey, string>>(() => {
    try {
      const parsed = getStorageItem<Partial<Record<ColumnKey, string>>>(COLUMN_TITLES_STORAGE_KEY, {});
      if (Object.keys(parsed).length > 0) {
        return { ...COLUMN_TITLES, ...parsed };
      }
    } catch (error) {
      devWarn('Failed to restore column titles', error);
    }
    return { ...COLUMN_TITLES };
  });
  const [columnDisplayOrder, setColumnDisplayOrder] = useState<ColumnKey[]>(() => {
    try {
      const parsed = getStorageItem<ColumnKey[]>(COLUMN_DISPLAY_ORDER_KEY, []);
      if (parsed.length > 0) {
        // Validate that all columns are present
        const allColumns = COLUMN_ORDER;
        const validOrder = allColumns.filter(col => parsed.includes(col));
        const missingColumns = allColumns.filter(col => !parsed.includes(col));
        return [...validOrder, ...missingColumns];
      }
    } catch (error) {
      devWarn('Failed to restore column display order', error);
    }
    return [...COLUMN_ORDER];
  });
  const [isColumnSettingsModalOpen, setIsColumnSettingsModalOpen] = useState(false);
  const [columnAssignments, setColumnAssignments] = useState<Record<string, ColumnKey>>(() => {
    try {
      return getStorageItem<Record<string, ColumnKey>>(COLUMN_ASSIGNMENTS_STORAGE_KEY, {});
    } catch (error) {
      devWarn('Failed to restore column assignments', error);
      return {};
    }
  });
  const [orderMap, setOrderMap] = useState<Record<ColumnKey, string[]>>({
    Active: [],
    Stale: [],
    Dormant: [],
    Archived: [],
  });
  const [hiddenRepoIds, setHiddenRepoIds] = useState<Set<string>>(() => {
    try {
      const arr = getStorageItem<string[]>(HIDDEN_REPOS_STORAGE_KEY, []);
      return new Set(arr);
    } catch (error) {
      devWarn('Failed to restore hidden repo ids', error);
      return new Set();
    }
  });

  // Load presets on mount and when user changes
  useEffect(() => {
    setPresets(getPresets(user?.userId));
    // Load order map
    try {
      const parsed = getStorageItem<Record<ColumnKey, string[]>>(ORDER_STORAGE_KEY, {});
      if (Object.keys(parsed).length > 0) {
        setOrderMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      devWarn('Failed to restore column order map', error);
    }
  }, [user?.userId]);

  const filteredRepos = useMemo(() => {
    const searchResults = searchAndSortRepos(repos, searchQuery, sortOrder, getTagObjectsForRepo);
    // Filter out hidden repos
    return searchResults.filter((repo) => !hiddenRepoIds.has(repo.id));
  }, [repos, searchQuery, sortOrder, hiddenRepoIds, getTagObjectsForRepo]);

  const repoMap = useMemo(() => new Map(repos.map((repo) => [repo.id, repo] as const)), [repos]);

  const hiddenReposList = useMemo(
    () =>
      Array.from(hiddenRepoIds)
        .map((id) => repoMap.get(id))
        .filter((repo): repo is Repo => Boolean(repo)),
    [hiddenRepoIds, repoMap]
  );

  // Apply search and sort, then classify into columns with manual overrides
  const classifiedRepos = useMemo(() => {
    // Initialize all columns (fixed + custom)
    const columns: Partial<Record<ColumnKey, Repo[]>> = {};
    
    // Initialize fixed columns
    columns.Active = [];
    columns.Stale = [];
    columns.Dormant = [];
    columns.Archived = [];
    
    // Initialize custom columns
    columnDisplayOrder.forEach((col) => {
      if (!columns[col]) {
        columns[col] = [];
      }
    });

    // Use dynamic thresholds for classification
    const dynamicConfig = {
      ...config,
      activeThreshold: thresholds.activeThreshold,
      staleThreshold: thresholds.staleThreshold,
    };

    filteredRepos.forEach((repo) => {
      const override = columnAssignments[repo.id];
      const column = override ?? classifyRepo(repo, configToOptions(dynamicConfig));
      if (!columns[column]) {
        columns[column] = [];
      }
      columns[column]!.push(repo);
    });

    return columns as Record<ColumnKey, Repo[]>;
  }, [filteredRepos, columnAssignments, config, thresholds, columnDisplayOrder]);

  const categoryCounts: Record<ColumnKey, number> = useMemo(() => {
    const counts: Partial<Record<ColumnKey, number>> = {};
    columnDisplayOrder.forEach((col) => {
      counts[col] = classifiedRepos[col]?.length || 0;
    });
    return counts as Record<ColumnKey, number>;
  }, [classifiedRepos, columnDisplayOrder]);

  // Notify parent of stats updates
  useEffect(() => {
    if (onStatsUpdate) {
      const totalVisible = Object.values(classifiedRepos).reduce((sum, repos) => sum + repos.length, 0);
      onStatsUpdate(totalVisible, categoryCounts, columnTitles);
    }
  }, [classifiedRepos, onStatsUpdate, columnTitles, categoryCounts]);

  useEffect(() => {
    setStorageItem(COLUMN_TITLES_STORAGE_KEY, columnTitles);
  }, [columnTitles]);

  useEffect(() => {
    setStorageItem(COLUMN_DISPLAY_ORDER_KEY, columnDisplayOrder);
    
    // Ensure all columns in display order have titles
    setColumnTitles((prev) => {
      const updated = { ...prev };
      columnDisplayOrder.forEach((col) => {
        if (!updated[col]) {
          updated[col] = col;
        }
      });
      return updated;
    });
  }, [columnDisplayOrder]);

  useEffect(() => {
    setStorageItem(COLUMN_ASSIGNMENTS_STORAGE_KEY, columnAssignments);
  }, [columnAssignments]);

  // Persist hidden repos
  useEffect(() => {
    setStorageItem(HIDDEN_REPOS_STORAGE_KEY, Array.from(hiddenRepoIds));
  }, [hiddenRepoIds]);

  // Sync order map with current repos per column
  useEffect(() => {
    const next: Record<ColumnKey, string[]> = {} as Record<ColumnKey, string[]>;
    columnDisplayOrder.forEach((col) => {
      const ids = classifiedRepos[col]?.map((r) => r.id) || [];
      const existing = orderMap[col] || [];
      // keep existing order, append any new ids
      const ordered = [...existing.filter((id) => ids.includes(id)), ...ids.filter((id) => !existing.includes(id))];
      next[col] = ordered;
    });
    setOrderMap(next);
  }, [classifiedRepos, columnDisplayOrder]);

  // Persist order map
  useEffect(() => {
    setStorageItem(ORDER_STORAGE_KEY, orderMap);
  }, [orderMap]);

  // Calculate total counts
  const totalRepos = repos.length;
  const filteredCount = Object.values(classifiedRepos).reduce(
    (sum, columnRepos) => sum + columnRepos.length,
    0
  );

  // Provide ordered repos per column with stable references
  const orderedReposByColumn = useMemo(() => {
    const ordered: Record<ColumnKey, Repo[]> = {} as Record<ColumnKey, Repo[]>;
    columnDisplayOrder.forEach((col) => {
      const idOrder = orderMap[col] || [];
      const repoList = classifiedRepos[col] || [];
      const repoLookup = new Map(repoList.map((repo) => [repo.id, repo] as const));
      const next: Repo[] = [];

      idOrder.forEach((id) => {
        const repo = repoLookup.get(id);
        if (repo) {
          next.push(repo);
        }
      });

      repoList.forEach((repo) => {
        if (!idOrder.includes(repo.id)) {
          next.push(repo);
        }
      });

      ordered[col] = next;
    });
    return ordered;
  }, [orderMap, classifiedRepos, columnDisplayOrder]);

  const handleColumnTitleChange = useCallback((col: ColumnKey, newTitle: string) => {
    setColumnTitles((prev) => {
      const trimmed = newTitle.trim();
      if (!trimmed || prev[col] === trimmed) {
        return prev;
      }
      return { ...prev, [col]: trimmed };
    });
  }, []);


  const handleReorderWithinColumn = useCallback(
    (col: ColumnKey, fromId: string, toId?: string) => {
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
    },
    []
  );

  const handleReorderBetween = useCallback(
    (fromCol: ColumnKey, toCol: ColumnKey, fromId: string, toId?: string) => {
      if (fromCol === toCol) {
        handleReorderWithinColumn(fromCol, fromId, toId);
        return;
      }

      const repo = repoMap.get(fromId);
      if (!repo) {
        return;
      }

      setColumnAssignments((prev) => {
        const next = { ...prev };
        const defaultColumn = classifyRepo(repo, configToOptions(config));
        if (toCol === defaultColumn) {
          delete next[fromId];
        } else {
          next[fromId] = toCol;
        }
        return next;
      });

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
    },
    [config, handleReorderWithinColumn, repoMap]
  );

  const handleHideRepo = useCallback((repoId: string) => {
    setHiddenRepoIds((prev) => new Set([...prev, repoId]));
  }, []);

  const handleUnhideRepo = useCallback((repoId: string) => {
    setHiddenRepoIds((prev) => {
      const next = new Set(prev);
      next.delete(repoId);
      return next;
    });
  }, []);

  const handleUnhideAll = useCallback(() => {
    setHiddenRepoIds(new Set());
  }, []);

  // Preset handlers
  const handlePresetSelect = (presetId: string) => {
    if (presetId === '') {
      // Clear preset selection
      setCurrentPresetId('');
      return;
    }

    const preset = getPresetById(presetId, user?.userId);
    if (preset) {
      // Load all state from preset
      setSearchQuery(preset.searchQuery);
      setSortOrder(preset.sortOrder);
      setColumnTitles(preset.columnTitles);
      setOrderMap(preset.columnOrder);
      setThresholds(preset.thresholds);
      setColumnAssignments(preset.columnAssignments);
      setHiddenRepoIds(new Set(preset.hiddenRepoIds));

      if (Array.isArray(preset.columnDisplayOrder) && preset.columnDisplayOrder.length > 0) {
        setColumnDisplayOrder(preset.columnDisplayOrder);
      }

      setCurrentPresetId(presetId);
    }
  };

  const handleSavePreset = (name: string) => {
    const presetSnapshot = createPresetSnapshot({
      name,
      searchQuery,
      sortOrder,
      columnTitles,
      columnOrder: orderMap,
      columnDisplayOrder,
      thresholds,
      columnAssignments,
      hiddenRepoIds: Array.from(hiddenRepoIds),
    });

    const newPreset = savePreset(presetSnapshot, user?.userId);
    if (newPreset) {
      setPresets(getPresets(user?.userId));
      setCurrentPresetId(newPreset.id);
      return true;
    }
    return false;
  };

  const handleDeletePreset = (presetId: string) => {
    if (deletePreset(presetId, user?.userId)) {
      setPresets(getPresets(user?.userId));
      if (currentPresetId === presetId) {
        setCurrentPresetId('');
      }
      return true;
    }
    return false;
  };

  const handleColumnSettingsSave = useCallback(
    (newTitles: Record<ColumnKey, string>, newOrder: ColumnKey[]) => {
      // Find deleted columns
      const deletedColumns = columnDisplayOrder.filter((col) => !newOrder.includes(col));
      
      // Reassign repos from deleted columns to their default classification
      if (deletedColumns.length > 0) {
        const updatedAssignments = { ...columnAssignments };
        deletedColumns.forEach((deletedCol) => {
          // Find repos assigned to deleted column
          Object.keys(columnAssignments).forEach((repoId) => {
            if (columnAssignments[repoId] === deletedCol) {
              // Remove assignment to let it use default classification
              delete updatedAssignments[repoId];
            }
          });
        });
        setColumnAssignments(updatedAssignments);
      }
      
      setColumnTitles(newTitles);
      setColumnDisplayOrder(newOrder);
    },
    [columnAssignments, columnDisplayOrder]
  );

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setStorageItem(VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  const openColumnSettings = useCallback(() => {
    setIsColumnSettingsModalOpen(true);
  }, []);

  // View mode button component
  const ViewModeButton = ({ mode, icon, label }: { mode: ViewMode; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => handleViewModeChange(mode)}
      className={`
        p-2 rounded-lg transition-all
        ${viewMode === mode
          ? 'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        }
      `}
      title={label}
      aria-label={label}
      aria-pressed={viewMode === mode}
    >
      {icon}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-surface-app transition-colors">
      <TopBar
        title={user?.username ? `${user.username} の DevBoard` : 'DevBoard'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        totalRepos={totalRepos}
        filteredCount={filteredCount}
        isLoading={isLoading}
        onRefresh={onRefresh}
        presets={presets}
        currentPresetId={currentPresetId}
        onPresetSelect={handlePresetSelect}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        columnTitles={columnTitles}
        thresholds={thresholds}
        hiddenRepos={hiddenReposList}
        onUnhideRepo={handleUnhideRepo}
        onUnhideAll={handleUnhideAll}
        lastUpdateTime={lastUpdateTime}
        onOpenColumnSettings={openColumnSettings}
      />

      {/* View Mode Switcher */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-caption font-medium text-[var(--text-muted)]">表示:</span>
          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
            <ViewModeButton
              mode="kanban"
              label="カンバン表示"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              }
            />
            <ViewModeButton
              mode="grid"
              label="グリッド表示"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              }
            />
            <ViewModeButton
              mode="list"
              label="リスト表示"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              }
            />
          </div>
        </div>
        <div className="text-caption text-[var(--text-muted)]">
          {filteredCount} / {totalRepos} リポジトリ
        </div>
      </div>

      {filteredRepos.length === 0 && !isLoading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h2 className="text-title-1 font-bold text-[var(--text-primary)] mb-2">
              まだリポジトリが追加されていません
            </h2>
            <p className="text-[var(--text-muted)] mb-6">
              リポジトリを追加して、カンバンボードで管理しましょう
            </p>
            <button
              onClick={() => {
                const event = new CustomEvent('openAddRepoModal');
                window.dispatchEvent(event);
              }}
              className="inline-flex items-center gap-inline-sm px-inset-lg py-inset-sm bg-[var(--accent-green)] text-text-inverse rounded-xl hover:bg-[var(--accent-green-strong)] transition-colors font-medium shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v14m7-7H5"
                />
              </svg>
              リポジトリを追加
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <div className="flex-1 flex gap-4 p-4 overflow-x-auto" aria-live="polite">
              {columnDisplayOrder.map((columnKey) => (
                <RepoColumn
                  key={columnKey}
                  title={columnTitles[columnKey] || columnKey}
                  repos={orderedReposByColumn[columnKey] || []}
                  columnKey={columnKey}
                  onReorder={handleReorderWithinColumn}
                  onReorderBetween={handleReorderBetween}
                  onTitleChange={handleColumnTitleChange}
                  onHide={handleHideRepo}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="flex-1 overflow-auto">
              <RepoGrid repos={filteredRepos} isLoading={isLoading} />
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="flex-1 overflow-auto">
              <RepoList repos={filteredRepos} isLoading={isLoading} />
            </div>
          )}
        </>
      )}

      {/* Column Settings Modal */}
      {isColumnSettingsModalOpen && (
        <MainColumnSettingsModal
          columnTitles={columnTitles}
          columnOrder={columnDisplayOrder}
          onSave={handleColumnSettingsSave}
          onClose={() => setIsColumnSettingsModalOpen(false)}
          columnCounts={categoryCounts}
        />
      )}
    </div>
  );
};
