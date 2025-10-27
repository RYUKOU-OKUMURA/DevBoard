import React, { useState } from 'react';
import { SortOrder, SavedView, Repo, ViewPreset, ColumnKey } from '../types';

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
  onCategorySettings?: () => void;
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
  onCategorySettings,
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
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {onCategorySettings && (
              <button
                onClick={onCategorySettings}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-1"
                title="カテゴリプロファイル設定 (開発中)"
              >
                カテゴリ設定
                <span className="text-xs bg-purple-500 px-1.5 py-0.5 rounded-md">開発中</span>
              </button>
            )}
            {hiddenRepos.length > 0 && (
              <button
                onClick={() => setShowHiddenDialog(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors relative"
                title="非表示のリポジトリを管理"
              >
                非表示を管理
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {hiddenRepos.length}
                </span>
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="リポジトリを検索（名前、言語、トピック、説明...）"
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
            >
              <option value="lastUpdated">並び替え: 最終更新日</option>
              <option value="name">並び替え: 名前 (A-Z)</option>
              <option value="stars">並び替え: スター数</option>
              <option value="language">並び替え: 言語</option>
            </select>
          </div>

          {/* Saved Views Selector */}
          <div className="sm:w-64 flex gap-2">
            <select
              value={currentViewId}
              onChange={handleViewChange}
              disabled={!onViewSelect}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all"
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
              className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title="現在のビューを保存"
            >
              +
            </button>
            {currentViewId && onDeleteView && (
              <button
                onClick={(event) => handleDeleteClick(currentViewId, event)}
                className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                title="選択中のビューを削除"
              >
                ×
              </button>
            )}
          </div>

          {/* Preset Selector */}
          <div className="sm:w-64 flex gap-2">
            <select
              value={currentPresetId}
              onChange={handlePresetChange}
              disabled={!onPresetSelect}
              className="flex-1 px-4 py-2 border border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-purple-50 dark:bg-purple-900/20 text-gray-900 dark:text-gray-100 transition-all"
            >
              <option value="">プリセット ({presets.length}/5)</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowPresetDialog(true)}
              disabled={presets.length >= 5}
              className="px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title="現在の状態をプリセットとして保存"
            >
              +
            </button>
            {currentPresetId && onDeletePreset && (
              <button
                onClick={(event) => handleDeletePresetClick(currentPresetId, event)}
                className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                title="選択中のプリセットを削除"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          合計 {totalRepos} 件中 {filteredCount} 件を表示
          {searchQuery && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              （フィルター: "{searchQuery}"）
            </span>
          )}
        </div>
      </div>

      {/* Save View Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">現在のビューを保存</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              現在の検索キーワードと並び順を保存します。
            </p>
            <div className="mb-4">
              <label htmlFor="viewName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoFocus
              />
              {saveError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>検索:</strong> {searchQuery || '（なし）'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>並び順:</strong>{' '}
                {sortOrder === 'lastUpdated' && '最終更新日'}
                {sortOrder === 'name' && '名前 (A-Z)'}
                {sortOrder === 'stars' && 'スター数'}
                {sortOrder === 'language' && '言語'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveClick}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
              >
                保存
              </button>
              <button
                onClick={handleDialogClose}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">プリセットとして保存</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              現在のダッシュボードの状態（検索、並び順、カラム配置、カラム名、しきい値など）を保存します。
            </p>
            <div className="mb-4">
              <label htmlFor="presetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  // Do not allow Enter to trigger save implicitly; require explicit click on the 保存 button
                  if (event.key === 'Enter' && !event.isComposing) {
                    event.preventDefault();
                    return;
                  }
                  if (event.key === 'Escape') {
                    handlePresetDialogClose();
                  }
                }}
                placeholder="例: 開発中プロジェクト"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoFocus
              />
              {presetError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{presetError}</p>
              )}
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-4 space-y-2">
              <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">保存される内容:</h3>

              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>検索:</strong> {searchQuery || '（なし）'}
              </div>

              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>並び順:</strong>{' '}
                {sortOrder === 'lastUpdated' && '最終更新日'}
                {sortOrder === 'name' && '名前 (A-Z)'}
                {sortOrder === 'stars' && 'スター数'}
                {sortOrder === 'language' && '言語'}
              </div>

              {columnTitles && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
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
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>表示中のカラム:</strong>{' '}
                  {Object.entries(columnVisibility)
                    .filter(([, visible]) => visible)
                    .map(([key]) => key)
                    .join(', ')}
                </div>
              )}

              {thresholds && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>しきい値:</strong> アクティブ={thresholds.activeThreshold}日,
                  停滞={thresholds.staleThreshold}日
                </div>
              )}

              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>カードの並び順:</strong> 現在の配置を保存
              </div>

              {hiddenRepos && hiddenRepos.length > 0 && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>非表示リポジトリ:</strong> {hiddenRepos.length}件
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSavePresetClick}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors"
              >
                保存
              </button>
              <button
                onClick={handlePresetDialogClose}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Repos Dialog */}
      {showHiddenDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">非表示のリポジトリ ({hiddenRepos.length})</h2>
              <button
                onClick={() => setShowHiddenDialog(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="閉じる"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {hiddenRepos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">非表示のリポジトリはありません</p>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {hiddenRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{repo.nameWithOwner}</p>
                        {repo.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{repo.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onUnhideRepo?.(repo.id)}
                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                      >
                        表示
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => {
                      onUnhideAll?.();
                      setShowHiddenDialog(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
                  >
                    すべて表示
                  </button>
                  <button
                    onClick={() => setShowHiddenDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
