import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { SortOrder, Repo, ViewPreset, ColumnKey } from '../types';
import { formatLastUpdateTime } from '../utils/timeFormatter';
import { focusRing } from '../lib/focusRing';
import { GlassModal } from './ui/GlassModal';
import { TagManager } from './TagManager';

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
  // Preset props
  presets?: ViewPreset[];
  currentPresetId?: string;
  onPresetSelect?: (presetId: string) => void;
  onSavePreset?: (name: string) => boolean;
  onDeletePreset?: (presetId: string) => boolean;
  columnTitles?: Record<ColumnKey, string>;
  thresholds?: { activeThreshold: number; staleThreshold: number };
  // Other props
  hiddenRepos?: Repo[];
  onUnhideRepo?: (repoId: string) => void;
  onUnhideAll?: () => void;
  lastUpdateTime?: number | null;
  onOpenColumnSettings?: () => void;
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
  presets = [],
  currentPresetId = '',
  onPresetSelect,
  onSavePreset,
  onDeletePreset,
  columnTitles,
  thresholds,
  hiddenRepos = [],
  onUnhideRepo,
  onUnhideAll,
  lastUpdateTime,
  onOpenColumnSettings,
}) => {
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showHiddenDialog, setShowHiddenDialog] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetError, setPresetError] = useState('');


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
            {onOpenColumnSettings && (
              <button
                onClick={onOpenColumnSettings}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] hover:bg-[var(--accent-blue-hover)] transition-colors font-medium text-body-sm border border-[var(--accent-blue-border)]"
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
            )}
            {/* Tag Management Button */}
            <button
              onClick={() => setShowTagManager(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-purple-muted)] text-brand-purple hover:bg-brand-purple hover:text-white transition-colors font-medium text-body-sm border border-[var(--accent-purple-border)] ${focusRing.default} ${focusRing.brand}`}
              title="タグを管理"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              タグ管理
            </button>
            {hiddenRepos.length > 0 && (
            <button
              onClick={() => setShowHiddenDialog(true)}
              className={`px-inset-md py-inset-xs bg-[var(--accent-blue)] text-white rounded-xl hover:bg-[var(--accent-blue-emphasis)] transition-colors motion-reduce:transition-none relative shadow-sm ${focusRing.default} focus-visible:ring-[var(--accent-blue)] focus-visible:ring-opacity-75`}
              title="非表示のリポジトリを管理"
              aria-haspopup="dialog"
              aria-expanded={showHiddenDialog}
            >
                非表示を管理
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-caption font-bold text-white bg-white/20 rounded-full shadow-sm">
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

      {/* Save Preset Dialog */}
      <GlassModal
        isOpen={showPresetDialog}
        onClose={handlePresetDialogClose}
        title="プリセットとして保存"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        tone="light"
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
              style={{ color: 'var(--text-primary)' }}
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
        className="max-w-4xl max-h-[90vh]"
        tone="light"
      >
        {hiddenRepos.length === 0 ? (
          <p className="text-[var(--text-muted)] text-center py-8">非表示のリポジトリはありません</p>
        ) : (
          <div className="flex flex-col gap-6 max-h-[70vh]">
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 pb-inset-sm">
              {hiddenRepos.map((repo) => {
                const topicHighlights = (repo.topics || []).slice(0, 3);
                return (
                  <motion.div
                    key={repo.id}
                    layout
                    whileHover={{
                      translateY: -2,
                      borderColor: 'var(--brand-purple)',
                      boxShadow: '0 25px 45px rgba(15,23,42,0.15)',
                    }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface-primary px-5 py-5 shadow-sm"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.35), rgba(103,58,183,0.18))',
                      }}
                      aria-hidden="true"
                    />
                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0 space-y-2 text-[var(--text-primary)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={repo.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`truncate text-title-3 font-semibold transition-colors hover:text-[var(--brand-purple)] ${focusRing.default} focus-visible:ring-[var(--brand-purple)] focus-visible:ring-opacity-75`}
                            aria-label={`${repo.nameWithOwner} をGitHubで開く`}
                          >
                            {repo.nameWithOwner}
                          </a>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-surface-secondary px-2 py-0.5 text-caption font-semibold uppercase tracking-[0.2em] ${
                              repo.isPrivate ? 'text-[var(--brand-red)]' : 'text-[var(--accent-green)]'
                            }`}
                          >
                            {repo.isPrivate ? 'Private' : 'Public'}
                          </span>
                          {repo.isArchived && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-surface-secondary px-2 py-0.5 text-caption font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                              Archived
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-body-sm text-[var(--text-muted)]">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-body-sm">
                          {repo.primaryLanguage && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-surface-secondary px-3 py-1">
                              <span className="h-2 w-2 rounded-full bg-[var(--brand-red)]" aria-hidden="true" />
                              {repo.primaryLanguage}
                            </span>
                          )}
                          {typeof repo.stargazers_count === 'number' && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-surface-secondary px-3 py-1">
                              <svg className="h-4 w-4 text-[var(--accent-yellow)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M12 3.5 14.45 9h5.55l-4.5 3.3 1.7 5.2L12 14.7 6.8 17.5 8.5 12.3 4 9h5.55z" />
                              </svg>
                              {repo.stargazers_count.toLocaleString()} Stars
                            </span>
                          )}
                          {topicHighlights.map((topic) => (
                            <span
                              key={topic}
                              className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-surface-secondary px-3 py-1 text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                            >
                              #{topic}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-surface-secondary px-4 py-2 text-body-sm text-[var(--text-primary)] transition-colors hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] ${focusRing.default} focus-visible:ring-[var(--brand-purple)] focus-visible:ring-opacity-75`}
                        >
                          GitHubで開く
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M7 7h10v10" />
                          </svg>
                        </a>
                        <button
                          onClick={() => onUnhideRepo?.(repo.id)}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-body-sm text-text-inverse transition-all motion-reduce:transition-none shadow-md ${focusRing.default} focus-visible:ring-[var(--brand-purple)] focus-visible:ring-opacity-75`}
                          style={{
                            background: 'var(--brand-gradient)',
                            boxShadow: '0 18px 35px rgba(103,58,183,0.3)',
                          }}
                          aria-label={`${repo.nameWithOwner} をリストに戻す`}
                        >
                          リストに戻す
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex gap-inline-md shrink-0">
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

      {/* Tag Manager Modal */}
      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
      />
    </div>
  );
};
