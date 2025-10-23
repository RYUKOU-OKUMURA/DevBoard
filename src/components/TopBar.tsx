import React, { useState } from 'react';
import { SortOrder, SavedView } from '../types';

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
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState('');
  const [saveError, setSaveError] = useState('');

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

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="リポジトリを検索（名前、言語、トピック、説明...）"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="lastUpdated">並び替え: 最終更新日</option>
              <option value="name">並び替え: 名前 (A-Z)</option>
            </select>
          </div>

          {/* Saved Views Selector */}
          <div className="sm:w-64 flex gap-2">
            <select
              value={currentViewId}
              onChange={handleViewChange}
              disabled={!onViewSelect}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title="現在のビューを保存"
            >
              +
            </button>
            {currentViewId && onDeleteView && (
              <button
                onClick={(event) => handleDeleteClick(currentViewId, event)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="選択中のビューを削除"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 text-sm text-gray-600">
          合計 {totalRepos} 件中 {filteredCount} 件を表示
          {searchQuery && (
            <span className="ml-2 text-blue-600">
              （フィルター: "{searchQuery}"）
            </span>
          )}
        </div>
      </div>

      {/* Save View Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">現在のビューを保存</h2>
            <p className="text-gray-600 mb-4">
              現在の検索キーワードと並び順を保存します。
            </p>
            <div className="mb-4">
              <label htmlFor="viewName" className="block text-sm font-medium text-gray-700 mb-2">
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
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSaveClick();
                  } else if (event.key === 'Escape') {
                    handleDialogClose();
                  }
                }}
                placeholder="例: アクティブなTypeScriptプロジェクト"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {saveError && (
                <p className="mt-2 text-sm text-red-600">{saveError}</p>
              )}
            </div>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                <strong>検索:</strong> {searchQuery || '（なし）'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>並び順:</strong> {sortOrder === 'lastUpdated' ? '最終更新日' : '名前 (A-Z)'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveClick}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
              <button
                onClick={handleDialogClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
