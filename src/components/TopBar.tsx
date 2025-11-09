import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { SortOrder, SavedView, Repo, ViewPreset, ColumnKey } from '../types';
import { formatLastUpdateTime } from '../utils/timeFormatter';
import { focusRing } from '../lib/focusRing';
import { GlassModal } from './ui/GlassModal';

interface TopBarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  totalRepos: number;
  filteredCount: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  savedViews?: SavedView[];
  currentViewId?: string;
  onViewSelect?: (viewId: string) => void;
  onSaveView?: (name: string) => boolean;
  onDeleteView?: (viewId: string) => boolean;
  // Preset props
  presets?: ViewPreset[];
  currentPresetId?: string;
  onPresetSelect?: (presetId: string) => void;
  onSavePreset?: (name: string) => boolean;
  onDeletePreset?: (presetId: string) => boolean;
  columnTitles?: Record<ColumnKey, string>;
  columnVisibility?: Record<ColumnKey, boolean>;
  thresholds?: { activeThreshold: number; staleThreshold: number };
  // Other props
  hiddenRepos?: Repo[];
  onUnhideRepo?: (repoId: string) => void;
  onUnhideAll?: () => void;
  lastUpdateTime?: number | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
  totalRepos,
  filteredCount,
  isLoading = false,
  onRefresh,
  savedViews = [],
  currentViewId = '',
  onViewSelect,
  onSaveView,
  onDeleteView,
  presets = [],
  currentPresetId = '',
  onPresetSelect,
  onSavePreset,
  onDeletePreset,
  columnTitles,
  columnVisibility,
  thresholds,
  hiddenRepos = [],
  onUnhideRepo,
  onUnhideAll,
  lastUpdateTime,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showHiddenDialog, setShowHiddenDialog] = useState(false);
  const [viewName, setViewName] = useState('');
  const [presetName, setPresetName] = useState('');
  const [saveError, setSaveError] = useState('');
  const [presetError, setPresetError] = useState('');

  const handleViewChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onViewSelect) {
      onViewSelect(event.target.value);
    }
  };

  const handleSaveClick = () => {
    const trimmedName = viewName.trim();
    setSaveError('');

    if (!trimmedName) {
      setSaveError('ビュー名を入力してください');
      return;
    }

    if (!onSaveView) {
      setSaveError('保存機能が利用できません');
      return;
    }

    try {
      const success = onSaveView(trimmedName);
      if (success) {
        setViewName('');
        setShowSaveDialog(false);
      } else {
        setSaveError('保存に失敗しました。名前が重複しているか、上限（5件）に達しています。');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  const handleDeleteClick = (viewId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onDeleteView) {
      return;
    }

    if (window.confirm('この保存済みビューを削除してもよろしいですか？')) {
      const success = onDeleteView(viewId);
      if (!success) {
        setSaveError('削除に失敗しました。');
      }
    }
  };

  const handleDialogClose = () => {
    setShowSaveDialog(false);
    setViewName('');
    setSaveError('');
  };

  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onPresetSelect) {
      onPresetSelect(event.target.value);
    }
  };

  const handleSavePresetClick = () => {
    const trimmedName = presetName.trim();
    setPresetError('');

    if (!trimmedName) {
      setPresetError('プリセット名を入力してください');
      return;
    }

    if (!onSavePreset) {
      setPresetError('保存機能が利用できません');
      return;
    }

    try {
      const success = onSavePreset(trimmedName);
      if (success) {
        setPresetName('');
        setShowPresetDialog(false);
      } else {
        setPresetError('保存に失敗しました。名前が重複しているか、上限（5件）に達しています。');
      }
    } catch (error) {
      setPresetError(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  const handleDeletePresetClick = (presetId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onDeletePreset) {
      return;
    }

    if (window.confirm('このプリセットを削除してもよろしいですか？')) {
      const success = onDeletePreset(presetId);
      if (!success) {
        setPresetError('削除に失敗しました。');
      }
    }
  };

  const handlePresetDialogClose = () => {
    setShowPresetDialog(false);
    setPresetName('');
    setPresetError('');
  };

  return (
    <div className="bg-surface-primary border-b border-[var(--border-subtle)] shadow-sm transition-colors">
      <div className="px-inset-lg py-inset-md">
        <div className="flex items-center justify-between mb-stack-sm">
          <div className="flex items-center gap-inline-xs">
            <h1 className="text-title-1 font-bold text-[var(--text-primary)]">{title}</h1>
          </div>
          <div className="flex items-center gap-inline-md">
            {lastUpdateTime && (
            <div className="text-caption text-[var(--text-muted)] px-inset-sm py-inset-xs bg-surface-secondary rounded-lg border border-[var(--border-subtle)]">
                最終更新: {formatLastUpdateTime(lastUpdateTime)}
              </div>
            )}
            {hiddenRepos.length > 0 && (
            <button
              onClick={() => setShowHiddenDialog(true)}
              className={`px-inset-md py-inset-xs bg-[var(--accent-blue)] text-text-inverse rounded-xl hover:bg-[var(--accent-blue-emphasis)] transition-colors motion-reduce:transition-none relative shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-blue)] focus-visible:ring-opacity-75`}
              title="非表示のリポジトリを管理"
              aria-haspopup="dialog"
              aria-expanded={showHiddenDialog}
            >
                非表示を管理
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-caption font-bold text-brand-red bg-brand-red-soft rounded-full shadow-sm">
                  {hiddenRepos.length}
                </span>
              </button>
            )}
            {onRefresh && (
              <motion.button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className={`relative overflow-hidden px-inset-md py-inset-xs rounded-xl text-text-inverse shadow-sm transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--brand-purple)] focus-visible:ring-opacity-75 disabled:cursor-not-allowed disabled:opacity-70`}
                style={{
                  background: 'var(--brand-gradient)',
                  backgroundSize: '200% 100%',
                  color: 'var(--text-inverse)',
                  boxShadow: 'inset 0 1px 0 var(--metallic-edge-top)',
                }}
                whileHover={
                  isLoading
                    ? undefined
                    : {
                        backgroundPosition: '100% 50%',
                        boxShadow:
                          '0 4px 12px var(--brand-purple-glow), inset 0 1px 0 var(--metallic-edge-top)',
                      }
                }
                whileTap={isLoading ? undefined : { scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-text-inverse"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    読み込み中...
                  </span>
                ) : (
                  '↻ 更新'
                )}
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-stack-sm transition-colors">
          {/* Search Input */}
            <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="リポジトリを検索（名前、言語、トピック、説明...）"
                aria-label="リポジトリを検索"
                className={`
                  w-full px-inset-md py-inset-sm pl-inset-xl border border-[var(--border-subtle)] rounded-xl
                  bg-surface-secondary text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                  shadow-inner transition-all duration-150 motion-safe:ease-smooth motion-reduce:transition-none
                  ${focusRing.default} focus-visible:ring-[var(--brand-purple)] focus-visible:border-[var(--brand-purple)]
                `}
                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Sort Selector */}
            <div className="sm:w-48">
            <select
              value={sortOrder}
              onChange={(event) => onSortChange(event.target.value as SortOrder)}
              className={`w-full px-inset-md py-inset-xs border border-[var(--border-subtle)] rounded-xl bg-surface-secondary text-[var(--text-primary)] transition-all motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75 focus:border-transparent`}
            >
              <option value="lastUpdated">並び替え: 最終更新日</option>
              <option value="name">並び替え: 名前 (A-Z)</option>
              <option value="stars">並び替え: スター数</option>
              <option value="language">並び替え: 言語</option>
            </select>
          </div>

          {/* Saved Views Selector */}
          <div className="sm:w-64 flex gap-inline-md">
            <select
              value={currentViewId}
              onChange={handleViewChange}
              disabled={!onViewSelect}
              className={`flex-1 px-inset-md py-inset-xs border border-[var(--border-subtle)] rounded-xl bg-surface-secondary text-[var(--text-primary)] transition-all motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75 focus:border-transparent disabled:opacity-70`}
            >
              <option value="">保存済みビュー ({savedViews.length}/5)</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={savedViews.length >= 5}
              className={`px-inset-sm py-inset-xs bg-accent-green text-text-inverse rounded-xl hover:bg-accent-green-strong disabled:bg-surface-muted disabled:text-[var(--text-muted)] disabled:cursor-not-allowed transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75`}
              title="現在のビューを保存"
            >
              +
            </button>
            {currentViewId && onDeleteView && (
              <button
                onClick={(event) => handleDeleteClick(currentViewId, event)}
                className={`px-inset-sm py-inset-xs bg-[var(--brand-red)] text-text-inverse rounded-xl hover:bg-[var(--brand-red-emphasis)] transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--brand-red)] focus-visible:ring-opacity-75`}
                title="選択中のビューを削除"
              >
                ×
              </button>
            )}
          </div>

          {/* Preset Selector */}
          <div className="sm:w-64 flex gap-inline-md">
            <select
              value={currentPresetId}
              onChange={handlePresetChange}
              disabled={!onPresetSelect}
              className={`flex-1 px-inset-md py-inset-xs border border-[var(--accent-purple-border)] rounded-xl bg-[var(--accent-purple-muted)] text-[var(--text-primary)] transition-all motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-purple)] focus-visible:ring-opacity-75 focus:border-transparent disabled:opacity-70`}
            >
              <option value="">プリセット ({presets.length}/5)</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <motion.button
              type="button"
              onClick={() => setShowPresetDialog(true)}
              disabled={presets.length >= 5}
              className={`px-inset-sm py-inset-xs bg-[var(--brand-purple)] text-text-inverse rounded-xl transition-all motion-reduce:transition-none shadow-sm hover:bg-[var(--brand-red)] ${focusRing.default} focus-visible:ring-[var(--brand-purple)] focus-visible:ring-opacity-75 disabled:bg-surface-muted disabled:text-[var(--text-muted)] disabled:cursor-not-allowed`}
              title="現在の状態をプリセットとして保存"
              whileHover={{ scale: presets.length >= 5 ? 1 : 1.05 }}
              whileTap={{ scale: presets.length >= 5 ? 1 : 0.95 }}
            >
              +
            </motion.button>
            {currentPresetId && onDeletePreset && (
              <button
                onClick={(event) => handleDeletePresetClick(currentPresetId, event)}
                className={`px-inset-sm py-inset-xs bg-[var(--brand-red)] text-text-inverse rounded-xl hover:bg-[var(--brand-red-emphasis)] transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--brand-red)] focus-visible:ring-opacity-75`}
                title="選択中のプリセットを削除"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 text-body-sm text-[var(--text-muted)]" aria-live="polite">
          合計 {totalRepos} 件中 {filteredCount} 件を表示
          {searchQuery && (
            <span className="ml-2 text-[var(--accent-blue)]">
              （フィルター: &quot;{searchQuery}&quot;）
            </span>
          )}
        </div>
      </div>

      {/* Save View Dialog */}
      <GlassModal
        isOpen={showSaveDialog}
        onClose={handleDialogClose}
        title="現在のビューを保存"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-muted)]">
            現在の検索キーワードと並び順を保存します。
          </p>
          <div className="space-y-2">
            <label htmlFor="viewName" className="block text-body-sm font-medium text-[var(--text-secondary)]">
              ビュー名
            </label>
            <input
              id="viewName"
              type="text"
              value={viewName}
              onChange={(event) => {
                setViewName(event.target.value);
                setSaveError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  handleDialogClose();
                }
              }}
              placeholder="例: アクティブなTypeScriptプロジェクト"
              className={`w-full px-inset-md py-inset-xs border border-[var(--border-subtle)] rounded-xl bg-surface-secondary text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75 focus:border-transparent`}
              autoFocus
            />
            {saveError && <p className="text-body-sm text-[var(--accent-red-emphasis)]">{saveError}</p>}
          </div>
          <div className="bg-surface-secondary p-3 rounded-lg border border-[var(--border-subtle)]">
            <p className="text-body-sm text-[var(--text-muted)]">
              <strong>検索:</strong> {searchQuery || '（なし）'}
            </p>
            <p className="text-body-sm text-[var(--text-muted)]">
              <strong>並び順:</strong>{' '}
              {sortOrder === 'lastUpdated' && '最終更新日'}
              {sortOrder === 'name' && '名前 (A-Z)'}
              {sortOrder === 'stars' && 'スター数'}
              {sortOrder === 'language' && '言語'}
            </p>
          </div>
          <div className="flex gap-inline-md">
            <button
              onClick={handleSaveClick}
              className={`flex-1 px-inset-md py-inset-xs bg-accent-green text-text-inverse rounded-xl hover:bg-accent-green-strong transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75`}
            >
              保存
            </button>
            <button
              onClick={handleDialogClose}
              className={`flex-1 px-inset-md py-inset-xs bg-surface-tertiary text-[var(--text-secondary)] rounded-xl hover:bg-surface-hover transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-purple)] focus-visible:ring-opacity-75`}
            >
              キャンセル
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Save Preset Dialog */}
      <GlassModal
        isOpen={showPresetDialog}
        onClose={handlePresetDialogClose}
        title="プリセットとして保存"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-muted)]">
            現在のダッシュボードの状態（検索、並び順、カラム配置、カラム名、しきい値など）を保存します。
          </p>
          <div className="space-y-2">
            <label htmlFor="presetName" className="block text-body-sm font-medium text-[var(--text-secondary)]">
              プリセット名
            </label>
            <input
              id="presetName"
              type="text"
              value={presetName}
              onChange={(event) => {
                setPresetName(event.target.value);
                setPresetError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.isComposing) {
                  event.preventDefault();
                  return;
                }
                if (event.key === 'Escape') {
                  handlePresetDialogClose();
                }
              }}
              placeholder="例: 開発中プロジェクト"
              className={`w-full px-inset-md py-inset-xs border border-[var(--accent-purple-border)] rounded-xl bg-[var(--accent-purple-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-purple)] focus-visible:ring-opacity-75 focus:border-transparent`}
              autoFocus
            />
            {presetError && <p className="text-body-sm text-[var(--accent-red-emphasis)]">{presetError}</p>}
          </div>
          <div className="bg-[var(--accent-purple-muted)] border border-[var(--accent-purple-border)] p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-[var(--accent-purple-emphasis)]">保存される内容:</h3>
            <div className="text-body-sm text-[var(--text-secondary)]">
              <strong>検索:</strong> {searchQuery || '（なし）'}
            </div>
            <div className="text-body-sm text-[var(--text-secondary)]">
              <strong>並び順:</strong>{' '}
              {sortOrder === 'lastUpdated' && '最終更新日'}
              {sortOrder === 'name' && '名前 (A-Z)'}
              {sortOrder === 'stars' && 'スター数'}
              {sortOrder === 'language' && '言語'}
            </div>
            {columnTitles && (
              <div className="text-body-sm text-[var(--text-secondary)]">
                <strong>カラム名:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  {Object.entries(columnTitles).map(([key, title]) => (
                    <li key={key}>
                      {key}: {title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {columnVisibility && (
              <div className="text-body-sm text-[var(--text-secondary)]">
                <strong>表示中のカラム:</strong>{' '}
                {Object.entries(columnVisibility)
                  .filter(([, visible]) => visible)
                  .map(([key]) => key)
                  .join(', ')}
              </div>
            )}
            {thresholds && (
              <div className="text-body-sm text-[var(--text-secondary)]">
                <strong>しきい値:</strong> アクティブ={thresholds.activeThreshold}日, 停滞={thresholds.staleThreshold}日
              </div>
            )}
            <div className="text-body-sm text-[var(--text-secondary)]">
              <strong>カードの並び順:</strong> 現在の配置を保存
            </div>
            {hiddenRepos && hiddenRepos.length > 0 && (
              <div className="text-body-sm text-[var(--text-secondary)]">
                <strong>非表示リポジトリ:</strong> {hiddenRepos.length}件
              </div>
            )}
          </div>
          <div className="flex gap-inline-md">
            <button
              onClick={handleSavePresetClick}
              className={`flex-1 px-inset-md py-inset-xs bg-[var(--accent-purple)] text-text-inverse rounded-xl hover:bg-[var(--accent-purple-emphasis)] transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-purple)] focus-visible:ring-opacity-75`}
            >
              保存
            </button>
            <button
              onClick={handlePresetDialogClose}
              className={`flex-1 px-inset-md py-inset-xs bg-surface-tertiary text-[var(--text-secondary)] rounded-xl hover:bg-surface-hover transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-purple)] focus-visible:ring-opacity-75`}
            >
              キャンセル
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Hidden Repos Dialog */}
      <GlassModal
        isOpen={showHiddenDialog}
        onClose={() => setShowHiddenDialog(false)}
        title={`非表示のリポジトリ (${hiddenRepos.length})`}
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        {hiddenRepos.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">非表示のリポジトリはありません</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {hiddenRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-[var(--border-subtle)] shadow-sm transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">{repo.nameWithOwner}</p>
                    {repo.description && (
                      <p className="text-body-sm text-[var(--text-muted)] truncate">{repo.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onUnhideRepo?.(repo.id)}
                    className={`ml-inline-md px-inset-sm py-inline-xs bg-[var(--accent-blue)] text-text-inverse text-body-sm rounded hover:bg-[var(--accent-blue-emphasis)] transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-blue)] focus-visible:ring-opacity-75`}
                  >
                    表示
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-inline-md">
              <button
                onClick={() => {
                  onUnhideAll?.();
                  setShowHiddenDialog(false);
                }}
                className={`flex-1 px-inset-md py-inset-xs bg-accent-green text-text-inverse rounded-xl hover:bg-accent-green-strong transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75`}
              >
                すべて表示
              </button>
              <button
                onClick={() => setShowHiddenDialog(false)}
                className={`flex-1 px-inset-md py-inset-xs bg-surface-tertiary text-[var(--text-secondary)] rounded-xl hover:bg-surface-hover transition-colors motion-reduce:transition-none shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-purple)] focus-visible:ring-opacity-75`}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};
