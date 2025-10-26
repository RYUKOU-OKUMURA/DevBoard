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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">カテゴリプロファイル管理</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              開発中
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          <p className="text-sm text-gray-600 mb-4">
            カテゴリプロファイルを選択または管理できます。現在は{profiles.length}/6個のプロファイルがあります。
          </p>

          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                currentProfileId === profile.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{profile.name}</h3>
                <p className="text-sm text-gray-600">
                  {profile.categories.length} カテゴリ
                  {profile.isDefault && ' (デフォルト)'}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.categories.map((cat) => (
                    <span
                      key={cat.key}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
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
                    className={`px-3 py-1 text-white text-sm rounded transition-colors ${
                      profile.isDefault
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                    title={!profile.isDefault ? 'カスタムプロファイル機能は開発中です' : ''}
                  >
                    選択
                  </button>
                )}
                {!profile.isDefault && (
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-yellow-800 font-medium mb-1">
              ⚠️ 開発中の機能について
            </p>
            <p className="text-sm text-yellow-700">
              カスタムプロファイルの作成・編集機能は現在開発中です。現時点ではデフォルトプロファイル（Active/Stale/Dormant/Archived）のみ利用可能です。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
