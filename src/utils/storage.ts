/**
 * localStorage操作を統一し、エラーハンドリングと型安全性を提供するユーティリティ
 */

/**
 * localStorageが利用可能かどうかをチェック
 */
function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * localStorageから値を取得（型安全）
 * @param key - ストレージキー
 * @param defaultValue - デフォルト値（取得失敗時やキーが存在しない場合）
 * @returns 取得した値、またはデフォルト値
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    // パースエラーの場合はデフォルト値を返す
    console.warn(`Failed to parse storage item "${key}":`, error);
    // 壊れたデータを削除
    try {
      localStorage.removeItem(key);
    } catch {
      // 削除に失敗しても無視
    }
    return defaultValue;
  }
}

/**
 * localStorageに値を保存（型安全）
 * @param key - ストレージキー
 * @param value - 保存する値
 * @returns 保存に成功した場合true
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // ストレージが満杯などの場合
    console.error(`Failed to save storage item "${key}":`, error);
    return false;
  }
}

/**
 * localStorageから値を削除
 * @param key - ストレージキー
 * @returns 削除に成功した場合true
 */
export function removeStorageItem(key: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove storage item "${key}":`, error);
    return false;
  }
}

/**
 * localStorageから文字列値を取得（JSON.parseしない）
 * @param key - ストレージキー
 * @param defaultValue - デフォルト値
 * @returns 取得した文字列値、またはデフォルト値
 */
export function getStorageString(key: string, defaultValue: string): string {
  if (!isStorageAvailable()) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return item ?? defaultValue;
  } catch (error) {
    console.error(`Failed to get storage string "${key}":`, error);
    return defaultValue;
  }
}

/**
 * localStorageに文字列値を保存（JSON.stringifyしない）
 * @param key - ストレージキー
 * @param value - 保存する文字列値
 * @returns 保存に成功した場合true
 */
export function setStorageString(key: string, value: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to save storage string "${key}":`, error);
    return false;
  }
}

