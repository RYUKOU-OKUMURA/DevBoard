import React, { useState } from 'react';
import { ManualColumnConfig, ManualColumnKey } from '../utils/manualColumnStorage';

interface ColumnSettingsModalProps {
  config: ManualColumnConfig;
  onSave: (config: ManualColumnConfig) => void;
  onClose: () => void;
}

export const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({
  config,
  onSave,
  onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<ManualColumnConfig>(
    JSON.parse(JSON.stringify(config))
  );
  const [editingColumn, setEditingColumn] = useState<ManualColumnKey | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<ManualColumnKey | null>(null);

  // Handle column rename
  const handleRenameColumn = (oldName: ManualColumnKey, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingColumn(null);
      return;
    }

    if (localConfig.columns.includes(trimmed as ManualColumnKey)) {
      alert('その名前は既に使用されています');
      return;
    }

    const newConfig: ManualColumnConfig = {
      ...localConfig,
      columns: localConfig.columns.map((col) => (col === oldName ? (trimmed as ManualColumnKey) : col)),
      columnTitles: Object.fromEntries(
        Object.entries(localConfig.columnTitles).map(([key, value]) => [
          key === oldName ? trimmed : key,
          value,
        ])
      ),
      columnOrder: Object.fromEntries(
        Object.entries(localConfig.columnOrder).map(([key, value]) => [
          key === oldName ? trimmed : key,
          value,
        ])
      ),
      columnVisibility: Object.fromEntries(
        Object.entries(localConfig.columnVisibility).map(([key, value]) => [
          key === oldName ? trimmed : key,
          value,
        ])
      ),
    };

    setLocalConfig(newConfig);
    setEditingColumn(null);
  };

  // Handle add column
  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) {
      alert('列の名前を入力してください');
      return;
    }

    if (localConfig.columns.length >= 8) {
      alert('最大8列までしか追加できません');
      return;
    }

    if (localConfig.columns.includes(trimmed as ManualColumnKey)) {
      alert('その名前は既に使用されています');
      return;
    }

    const newColKey = trimmed as ManualColumnKey;
    const newConfig: ManualColumnConfig = {
      ...localConfig,
      columns: [...localConfig.columns, newColKey],
      columnTitles: {
        ...localConfig.columnTitles,
        [newColKey]: trimmed,
      },
      columnOrder: {
        ...localConfig.columnOrder,
        [newColKey]: [],
      },
      columnVisibility: {
        ...localConfig.columnVisibility,
        [newColKey]: true,
      },
    };

    setLocalConfig(newConfig);
    setNewColumnName('');
  };

  // Handle delete column
  const handleDeleteColumn = (colName: ManualColumnKey) => {
    if (localConfig.columns.length <= 1) {
      alert('最後の列は削除できません');
      return;
    }

    if (window.confirm(`列「${localConfig.columnTitles[colName]}」を削除しますか？`)) {
      const newConfig: ManualColumnConfig = {
        ...localConfig,
        columns: localConfig.columns.filter((col) => col !== colName),
        columnTitles: Object.fromEntries(
          Object.entries(localConfig.columnTitles).filter(([key]) => key !== colName)
        ),
        columnOrder: Object.fromEntries(
          Object.entries(localConfig.columnOrder).filter(([key]) => key !== colName)
        ),
        columnVisibility: Object.fromEntries(
          Object.entries(localConfig.columnVisibility).filter(([key]) => key !== colName)
        ),
      };

      setLocalConfig(newConfig);
    }
  };

  // Handle reorder columns
  const handleDragStart = (col: ManualColumnKey) => {
    setDraggedColumn(col);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetCol: ManualColumnKey) => {
    if (!draggedColumn || draggedColumn === targetCol) {
      setDraggedColumn(null);
      return;
    }

    const draggedIdx = localConfig.columns.indexOf(draggedColumn);
    const targetIdx = localConfig.columns.indexOf(targetCol);

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedColumn(null);
      return;
    }

    const newColumns = [...localConfig.columns];
    newColumns.splice(draggedIdx, 1);
    newColumns.splice(targetIdx, 0, draggedColumn);

    setLocalConfig({
      ...localConfig,
      columns: newColumns,
    });

    setDraggedColumn(null);
  };

  // Handle toggle visibility
  const handleToggleVisibility = (colName: ManualColumnKey) => {
    setLocalConfig({
      ...localConfig,
      columnVisibility: {
        ...localConfig.columnVisibility,
        [colName]: !localConfig.columnVisibility[colName],
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-primary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-surface-primary">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">列の管理</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add Column Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">新しい列を追加</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddColumn();
                  }
                }}
                placeholder="列の名前を入力..."
                maxLength={20}
                disabled={localConfig.columns.length >= 8}
                className="flex-1 px-3 py-2 bg-surface-tertiary border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleAddColumn}
                disabled={localConfig.columns.length >= 8}
                className="px-4 py-2 bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)] rounded-lg font-medium hover:bg-[var(--accent-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
            {localConfig.columns.length >= 8 && (
              <p className="text-xs text-[var(--accent-orange-strong)]">最大8列までしか追加できません</p>
            )}
          </div>

          {/* Columns List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">
              列の管理 ({localConfig.columns.length})
            </h3>
            <p className="text-sm text-[var(--text-muted)]">ドラッグして並び替えることができます</p>

            <div className="space-y-2">
              {localConfig.columns.map((colName) => (
                <div
                  key={colName}
                  draggable
                  onDragStart={() => handleDragStart(colName)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(colName)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${
                      draggedColumn === colName
                        ? 'bg-[var(--accent-blue-muted)] border-[var(--accent-blue-border)] opacity-75'
                        : 'bg-surface-secondary border-[var(--border-subtle)] hover:border-[var(--accent-blue-border)]'
                    }
                    ${localConfig.columns.length === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-move'}
                  `}
                >
                  {/* Drag Handle */}
                  <svg className="w-5 h-5 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="5" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="9" cy="19" r="1.5" />
                    <circle cx="15" cy="5" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="15" cy="19" r="1.5" />
                  </svg>

                  {/* Column Info */}
                  <div className="flex-1 min-w-0">
                    {editingColumn === colName ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameColumn(colName, editingTitle)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameColumn(colName, editingTitle);
                          } else if (e.key === 'Escape') {
                            setEditingColumn(null);
                          }
                        }}
                        className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--accent-blue-border)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                        maxLength={20}
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingColumn(colName);
                          setEditingTitle(colName);
                        }}
                        className="text-left w-full font-medium text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                      >
                        {localConfig.columnTitles[colName]}
                      </button>
                    )}
                    <p className="text-xs text-[var(--text-muted)]">
                      {localConfig.columnOrder[colName]?.length || 0} リポジトリ
                    </p>
                  </div>

                  {/* Visibility Toggle */}
                  <button
                    onClick={() => handleToggleVisibility(colName)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title={localConfig.columnVisibility[colName] ? '非表示にする' : '表示する'}
                  >
                    {localConfig.columnVisibility[colName] ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteColumn(colName)}
                    disabled={localConfig.columns.length === 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-100 hover:text-red-600 text-[var(--text-muted)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="削除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-subtle)] bg-surface-primary">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[var(--text-primary)] bg-surface-tertiary hover:bg-surface-hover border border-[var(--border-subtle)] transition-colors font-medium"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onSave(localConfig);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)] hover:bg-[var(--accent-green-hover)] transition-colors font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
