import React, { useState } from 'react';
import { ManualColumnConfig, ManualColumnKey } from '../utils/manualColumnStorage';
import { GlassModal } from './ui/GlassModal';

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

  return (
    <GlassModal
      isOpen
      onClose={onClose}
      title="列の管理"
      className="max-w-4xl max-h-[90vh]"
      tone="light"
    >
      <div className="flex flex-col gap-6 max-h-[65vh]">
        <div className="flex-1 min-h-0 space-y-6 overflow-y-auto pr-2 pb-inset-sm">
          {/* Add Column Section */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface-primary px-6 py-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">新しい列を追加</h3>
              <p className="text-body-sm text-[var(--text-muted)]">最大8列まで追加できます</p>
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
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
                className="flex-1 px-inset-md py-inset-sm bg-surface-secondary border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleAddColumn}
                disabled={localConfig.columns.length >= 8}
                className="px-inset-md py-inset-sm rounded-xl text-text-inverse font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--brand-gradient)',
                  boxShadow: '0 12px 25px rgba(103,58,183,0.25)',
                }}
              >
                列を追加
              </button>
            </div>
            {localConfig.columns.length >= 8 && (
              <p className="text-caption text-[var(--accent-orange-strong)]">最大8列までしか追加できません</p>
            )}
          </div>

          {/* Columns List */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface-primary px-6 py-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">列の管理 ({localConfig.columns.length})</h3>
              <p className="text-body-sm text-[var(--text-muted)]">ドラッグで並び替え、右側アイコンで削除を操作できます</p>
            </div>
            <div className="space-y-3">
              {localConfig.columns.map((colName) => (
                <div
                  key={colName}
                  draggable
                  onDragStart={() => handleDragStart(colName)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(colName)}
                  className={`flex items-center gap-inline-md rounded-2xl border px-4 py-4 shadow-sm transition-all ${
                    draggedColumn === colName
                      ? 'bg-[var(--accent-blue-muted)] border-[var(--accent-blue-border)] opacity-80'
                      : 'bg-surface-secondary border-[var(--border-subtle)] hover:border-[var(--accent-blue-border)]'
                  } ${localConfig.columns.length === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-move'}`}
                >
                  <svg className="w-5 h-5 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="5" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="9" cy="19" r="1.5" />
                    <circle cx="15" cy="5" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="15" cy="19" r="1.5" />
                  </svg>
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
                        className="w-full px-3 py-1.5 bg-surface-primary border border-[var(--accent-blue-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
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
                    <p className="text-caption text-[var(--text-muted)]">
                      {localConfig.columnOrder[colName]?.length || 0} リポジトリ
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteColumn(colName)}
                    disabled={localConfig.columns.length === 1}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--brand-red)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="削除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
          <button
            onClick={onClose}
            className="px-inset-md py-inset-xs rounded-xl text-[var(--text-primary)] bg-surface-secondary hover:bg-surface-hover border border-[var(--border-subtle)] transition-colors font-medium"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onSave(localConfig);
              onClose();
            }}
            className="px-inset-md py-inset-xs rounded-xl text-text-inverse font-semibold shadow-sm transition-all"
            style={{
              background: 'var(--brand-gradient)',
              boxShadow: '0 15px 30px rgba(103,58,183,0.3)',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
