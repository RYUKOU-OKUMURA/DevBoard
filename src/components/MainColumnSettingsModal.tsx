import React, { useState } from 'react';
import { ColumnKey } from '../types';
import { GlassModal } from './ui/GlassModal';

const FIXED_COLUMNS: ColumnKey[] = ['Active', 'Stale', 'Dormant', 'Archived'];

interface MainColumnSettingsModalProps {
  columnTitles: Record<ColumnKey, string>;
  columnOrder: ColumnKey[];
  onSave: (columnTitles: Record<ColumnKey, string>, columnOrder: ColumnKey[]) => void;
  onClose: () => void;
  columnCounts: Record<ColumnKey, number>;
}

export const MainColumnSettingsModal: React.FC<MainColumnSettingsModalProps> = ({
  columnTitles,
  columnOrder,
  onSave,
  onClose,
  columnCounts,
}) => {
  const [localTitles, setLocalTitles] = useState<Record<ColumnKey, string>>(
    JSON.parse(JSON.stringify(columnTitles))
  );
  const [localOrder, setLocalOrder] = useState<ColumnKey[]>([...columnOrder]);
  const [editingColumn, setEditingColumn] = useState<ColumnKey | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);

  // Sanitize column name for use in ID attribute
  const sanitizeId = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  };

  // Check if column is fixed (cannot be deleted)
  const isFixedColumn = (col: ColumnKey): boolean => {
    return FIXED_COLUMNS.includes(col);
  };

  // Handle column rename
  const handleRenameColumn = (col: ColumnKey, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === localTitles[col]) {
      setEditingColumn(null);
      return;
    }

    // Check if new name already exists
    if (Object.values(localTitles).includes(trimmed) && localTitles[col] !== trimmed) {
      alert('その名前は既に使用されています');
      return;
    }

    setLocalTitles((prev) => ({
      ...prev,
      [col]: trimmed,
    }));
    setEditingColumn(null);
  };

  // Handle add column
  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) {
      alert('列の名前を入力してください');
      return;
    }

    if (localOrder.length >= 8) {
      alert('最大8列までしか追加できません');
      return;
    }

    if (localOrder.includes(trimmed)) {
      alert('その名前は既に使用されています');
      return;
    }

    const newColKey = trimmed;
    setLocalOrder((prev) => [...prev, newColKey]);
    setLocalTitles((prev) => ({
      ...prev,
      [newColKey]: trimmed,
    }));
    setNewColumnName('');
  };

  // Handle delete column
  const handleDeleteColumn = (colName: ColumnKey) => {
    if (isFixedColumn(colName)) {
      alert('固定列は削除できません');
      return;
    }

    if (localOrder.length <= FIXED_COLUMNS.length) {
      alert('固定列以外の列が1つ以上必要です');
      return;
    }

    if (window.confirm(`列「${localTitles[colName]}」を削除しますか？`)) {
      setLocalOrder((prev) => prev.filter((col) => col !== colName));
      setLocalTitles((prev) => {
        const newTitles = { ...prev };
        delete newTitles[colName];
        return newTitles;
      });
    }
  };

  // Handle reorder columns
  const handleDragStart = (col: ColumnKey) => {
    setDraggedColumn(col);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetCol: ColumnKey) => {
    if (!draggedColumn || draggedColumn === targetCol) {
      setDraggedColumn(null);
      return;
    }

    const draggedIdx = localOrder.indexOf(draggedColumn);
    const targetIdx = localOrder.indexOf(targetCol);

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...localOrder];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    setLocalOrder(newOrder);
    setDraggedColumn(null);
  };

  const handleSave = () => {
    onSave(localTitles, localOrder);
    onClose();
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
                id="main-new-column-name-input"
                name="main-new-column-name"
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
                disabled={localOrder.length >= 8}
                className="flex-1 px-inset-md py-inset-sm bg-surface-secondary border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleAddColumn}
                disabled={localOrder.length >= 8}
                className="px-inset-md py-inset-sm rounded-xl text-text-inverse font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--brand-gradient)',
                  boxShadow: '0 12px 25px rgba(103,58,183,0.25)',
                }}
              >
                列を追加
              </button>
            </div>
            {localOrder.length >= 8 && (
              <p className="text-caption text-[var(--accent-orange-strong)]">最大8列までしか追加できません</p>
            )}
          </div>

          {/* Columns List */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface-primary px-6 py-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">列の管理 ({localOrder.length})</h3>
              <p className="text-body-sm text-[var(--text-muted)]">ドラッグで並び替え、クリックで名前を変更できます</p>
            </div>
            <div className="space-y-3">
              {localOrder.map((colName) => (
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
                  } cursor-move`}
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
                        id={`main-edit-column-${sanitizeId(colName)}`}
                        name={`main-edit-column-${sanitizeId(colName)}`}
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
                          setEditingTitle(localTitles[colName] ?? colName);
                        }}
                        className="text-left w-full font-medium text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                      >
                        {localTitles[colName] ?? colName}
                      </button>
                    )}
                    <p className="text-caption text-[var(--text-muted)]">
                      {columnCounts[colName] || 0} リポジトリ
                    </p>
                  </div>
                  {!isFixedColumn(colName) && (
                    <button
                      onClick={() => handleDeleteColumn(colName)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--brand-red)] transition-colors"
                      title="削除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
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
            onClick={handleSave}
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
