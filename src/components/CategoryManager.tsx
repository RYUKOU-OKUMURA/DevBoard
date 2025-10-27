import React, { useState, useEffect } from 'react';
import { CategoryProfile } from '../types';
import { getCategoryProfiles, deleteCategoryProfile } from '../utils/categoryProfiles';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfileId: string;
  onProfileSelect: (profileId: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  currentProfileId,
  onProfileSelect,
}) => {
  const [profiles, setProfiles] = useState<CategoryProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      setProfiles(getCategoryProfiles());
    }
  }, [isOpen]);

  const handleDelete = (profileId: string) => {
    if (window.confirm('このカテゴリプロファイルを削除してもよろしいですか？')) {
      if (deleteCategoryProfile(profileId)) {
        setProfiles(getCategoryProfiles());
        if (currentProfileId === profileId) {
          onProfileSelect('default');
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-primary border border-[color:var(--border-subtle)] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col shadow-lg transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">カテゴリプロファイル管理</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[color:var(--accent-yellow-muted)] text-[color:var(--accent-yellow-emphasis)] border border-[color:var(--accent-yellow-border)]">
              開発中
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          <p className="text-sm text-[color:var(--text-muted)] mb-4">
            カテゴリプロファイルを選択または管理できます。現在は{profiles.length}/6個のプロファイルがあります。
          </p>

          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                currentProfileId === profile.id
                  ? 'border-[color:var(--accent-blue)] bg-[color:var(--accent-blue-muted)]'
                  : 'border-[color:var(--border-subtle)] bg-surface-secondary'
              }`}
            >
              <div className="flex-1">
                <h3 className="font-medium text-[color:var(--text-primary)]">{profile.name}</h3>
                <p className="text-sm text-[color:var(--text-muted)]">
                  {profile.categories.length} カテゴリ
                  {profile.isDefault && ' (デフォルト)'}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.categories.map((cat) => (
                    <span
                      key={cat.key}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-tertiary text-[color:var(--text-secondary)]"
                    >
                      {cat.title}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {currentProfileId !== profile.id && (
                  <button
                    onClick={() => {
                      if (profile.isDefault) {
                        onProfileSelect(profile.id);
                        onClose();
                      }
                    }}
                    disabled={!profile.isDefault}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      profile.isDefault
                        ? 'bg-[color:var(--accent-blue)] text-text-inverse hover:bg-[color:var(--accent-blue-emphasis)]'
                        : 'bg-surface-muted text-[color:var(--text-muted)] cursor-not-allowed'
                    }`}
                    title={!profile.isDefault ? 'カスタムプロファイル機能は開発中です' : ''}
                  >
                    選択
                  </button>
                )}
                {!profile.isDefault && (
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="px-3 py-1 bg-[color:var(--accent-red)] text-text-inverse text-sm rounded hover:bg-[color:var(--accent-red-emphasis)] transition-colors"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[color:var(--border-subtle)] pt-4">
          <div className="bg-[color:var(--accent-yellow-muted)] border border-[color:var(--accent-yellow-border)] rounded-lg p-3 mb-3">
            <p className="text-sm text-[color:var(--accent-yellow-emphasis)] font-medium mb-1">
              ⚠️ 開発中の機能について
            </p>
            <p className="text-sm text-[color:var(--text-secondary)]">
              カスタムプロファイルの作成・編集機能は現在開発中です。現時点ではデフォルトプロファイル（Active/Stale/Dormant/Archived）のみ利用可能です。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-surface-tertiary text-[color:var(--text-secondary)] rounded-lg hover:bg-surface-hover transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
