/**
 * 手動追加リポジトリ用のカラム設定を管理
 * デフォルト列: ["気になる", "学習用", "フォーク済み", "その他"]
 */

import { getStorageItem, setStorageItem, removeStorageItem } from './storage';
import { devError, devWarn } from './logger';

export type ManualColumnKey = string;

export interface ManualColumnConfig {
  columns: ManualColumnKey[];
  columnTitles: Record<ManualColumnKey, string>;
  columnOrder: Record<ManualColumnKey, string[]>; // リポジトリIDの順序
}

export interface ManualColumnAssignments {
  [repoId: string]: ManualColumnKey; // リポジトリIDとカラムのマッピング
}

const MANUAL_COLUMNS_STORAGE_KEY = 'github-dashboard-manual-columns-config';
const MANUAL_COLUMN_ASSIGNMENTS_STORAGE_KEY = 'github-dashboard-manual-column-assignments';

// デフォルト列定義
const DEFAULT_COLUMNS: ManualColumnKey[] = [
  '気になる',
  '学習用',
  'フォーク済み',
  'その他',
];

const DEFAULT_COLUMN_CONFIG: ManualColumnConfig = {
  columns: DEFAULT_COLUMNS,
  columnTitles: {
    '気になる': '気になる',
    '学習用': '学習用',
    'フォーク済み': 'フォーク済み',
    'その他': 'その他',
  },
  columnOrder: {
    '気になる': [],
    '学習用': [],
    'フォーク済み': [],
    'その他': [],
  },
};

/**
 * 手動リポ用のカラム設定を取得
 */
export function getManualColumnConfig(): ManualColumnConfig {
  const config = getStorageItem<ManualColumnConfig>(MANUAL_COLUMNS_STORAGE_KEY, DEFAULT_COLUMN_CONFIG);
  
  // バージョン互換性をチェック
  if (!config.columns || !Array.isArray(config.columns)) {
    return structuredClone(DEFAULT_COLUMN_CONFIG);
  }

  return config;
}

/**
 * 手動リポ用のカラム設定を保存
 */
export function saveManualColumnConfig(config: ManualColumnConfig): boolean {
  // 設定の妥当性をチェック
  if (!config.columns || !Array.isArray(config.columns) || config.columns.length === 0) {
    devError('無効なカラム設定です');
    return false;
  }

  return setStorageItem(MANUAL_COLUMNS_STORAGE_KEY, config);
}

/**
 * 新しいカラムを追加
 */
export function addManualColumn(columnName: ManualColumnKey): boolean {
  try {
    const config = getManualColumnConfig();

    // 既に存在するかチェック
    if (config.columns.includes(columnName)) {
      devWarn(`カラム "${columnName}" は既に存在します`);
      return false;
    }

    config.columns.push(columnName);
    config.columnTitles[columnName] = columnName;
    config.columnOrder[columnName] = [];

    return saveManualColumnConfig(config);
  } catch (error) {
    devError('カラムの追加に失敗しました:', error);
    return false;
  }
}

/**
 * カラムを削除
 */
export function removeManualColumn(columnName: ManualColumnKey): boolean {
  try {
    const config = getManualColumnConfig();

    // 少なくとも1つのカラムは必要
    if (config.columns.length <= 1) {
      devError('最後のカラムは削除できません');
      return false;
    }

    // カラムが存在するかチェック
    if (!config.columns.includes(columnName)) {
      devWarn(`カラム "${columnName}" は見つかりません`);
      return false;
    }

    config.columns = config.columns.filter((col) => col !== columnName);
    delete config.columnTitles[columnName];
    delete config.columnOrder[columnName];

    // このカラムに割り当てられたリポジトリを削除
    const assignments = getManualColumnAssignments();
    const updatedAssignments = Object.fromEntries(
      Object.entries(assignments).filter(([, col]) => col !== columnName)
    );
    saveManualColumnAssignments(updatedAssignments);

    return saveManualColumnConfig(config);
  } catch (error) {
    devError('カラムの削除に失敗しました:', error);
    return false;
  }
}

/**
 * カラムの名前を変更
 */
export function renameManualColumn(oldName: ManualColumnKey, newName: ManualColumnKey): boolean {
  try {
    const config = getManualColumnConfig();

    // カラムが存在するかチェック
    if (!config.columns.includes(oldName)) {
      devWarn(`カラム "${oldName}" は見つかりません`);
      return false;
    }

    // 新しい名前が既に存在するかチェック
    if (config.columns.includes(newName)) {
      devError(`カラム "${newName}" は既に存在します`);
      return false;
    }

    // カラムリストを更新
    config.columns = config.columns.map((column) => (column === oldName ? newName : column));

    // 関連するプロパティを更新
    config.columnTitles[newName] = config.columnTitles[oldName] ?? newName;
    delete config.columnTitles[oldName];

    config.columnOrder[newName] = config.columnOrder[oldName] ?? [];
    delete config.columnOrder[oldName];

    // 割り当てを更新
    const assignments = getManualColumnAssignments();
    const updatedAssignments: ManualColumnAssignments = {};
    Object.entries(assignments).forEach(([repoId, colName]) => {
      updatedAssignments[repoId] = colName === oldName ? newName : colName;
    });
    saveManualColumnAssignments(updatedAssignments);

    return saveManualColumnConfig(config);
  } catch (error) {
    devError('カラムの名前変更に失敗しました:', error);
    return false;
  }
}

/**
 * すべての手動カラム設定をリセット
 */
export function resetManualColumns(): boolean {
  const removed1 = removeStorageItem(MANUAL_COLUMNS_STORAGE_KEY);
  const removed2 = removeStorageItem(MANUAL_COLUMN_ASSIGNMENTS_STORAGE_KEY);
  return removed1 && removed2;
}

// ===== リポジトリの割り当て管理 =====

/**
 * カラムへのリポジトリ割り当てを取得
 */
export function getManualColumnAssignments(): ManualColumnAssignments {
  return getStorageItem<ManualColumnAssignments>(MANUAL_COLUMN_ASSIGNMENTS_STORAGE_KEY, {});
}

/**
 * カラムへのリポジトリ割り当てを保存
 */
export function saveManualColumnAssignments(assignments: ManualColumnAssignments): boolean {
  return setStorageItem(MANUAL_COLUMN_ASSIGNMENTS_STORAGE_KEY, assignments);
}

/**
 * リポジトリをカラムに割り当て
 */
export function assignRepoToColumn(repoId: string, columnName: ManualColumnKey): boolean {
  try {
    const config = getManualColumnConfig();

    // カラムが存在するかチェック
    if (!config.columns.includes(columnName)) {
      devWarn(`カラム "${columnName}" は見つかりません`);
      return false;
    }

    const assignments = getManualColumnAssignments();
    const previousColumn = assignments[repoId];

    // 前のカラムから削除
    if (previousColumn) {
      const previousOrder = config.columnOrder[previousColumn];
      if (previousOrder) {
        config.columnOrder[previousColumn] = previousOrder.filter((id) => id !== repoId);
      }
    }

    // 新しいカラムに追加
    const nextColumnOrder = config.columnOrder[columnName] ?? [];
    if (!nextColumnOrder.includes(repoId)) {
      config.columnOrder[columnName] = [...nextColumnOrder, repoId];
    }

    // 割り当てを更新
    assignments[repoId] = columnName;

    return (
      saveManualColumnConfig(config) && saveManualColumnAssignments(assignments)
    );
  } catch (error) {
    devError('リポジトリの割り当てに失敗しました:', error);
    return false;
  }
}

/**
 * リポジトリの割り当てを解除
 */
export function unassignRepoFromColumn(repoId: string): boolean {
  try {
    const assignments = getManualColumnAssignments();
    const columnName = assignments[repoId];

    if (!columnName) {
      return true; // 割り当てが存在しない場合は成功
    }

    const config = getManualColumnConfig();
    const currentOrder = config.columnOrder[columnName];
    if (currentOrder) {
      config.columnOrder[columnName] = currentOrder.filter((id) => id !== repoId);
    }

    delete assignments[repoId];

    return (
      saveManualColumnConfig(config) && saveManualColumnAssignments(assignments)
    );
  } catch (error) {
    devError('リポジトリの割り当て解除に失敗しました:', error);
    return false;
  }
}

/**
 * リポジトリのカラムを取得
 */
export function getRepoColumn(repoId: string): ManualColumnKey | null {
  const assignments = getManualColumnAssignments();
  return assignments[repoId] || null;
}

/**
 * 指定したカラムのリポジトリを取得
 */
export function getReposInColumn(columnName: ManualColumnKey): string[] {
  const config = getManualColumnConfig();
  return config.columnOrder[columnName] || [];
}
