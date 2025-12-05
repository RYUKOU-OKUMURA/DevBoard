import type { Repo } from "../types";

/**
 * プレーンオブジェクト判定
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 期待する型でなければ例外を投げるユーティリティ
 */
export function ensureString(value: unknown, context: string): string {
  if (typeof value !== "string") {
    throw new Error(`${context}: expected string`);
  }
  return value;
}

export function ensureArray<T>(value: unknown, context: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${context}: expected array`);
  }
  return value as T[];
}

/**
 * 値が文字列かどうかをチェック
 */
function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * 値がブール値かどうかをチェック
 */
function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * 値が文字列配列かどうかをチェック
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isString(item));
}

/**
 * Repo 型のバリデーション
 */
export function isRepo(value: unknown): value is Repo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // 必須フィールドの検証
  if (!isString(obj.id)) return false;
  if (!isString(obj.nameWithOwner)) return false;
  if (!isString(obj.htmlUrl)) return false;
  if (!isString(obj.pushedAt)) return false;
  if (!isBoolean(obj.isArchived)) return false;
  if (!isBoolean(obj.isPrivate)) return false;
  if (!isStringArray(obj.topics)) return false;

  // オプショナルフィールドの検証
  if (obj.description !== undefined && !isString(obj.description)) {
    return false;
  }
  if (obj.primaryLanguage !== undefined && !isString(obj.primaryLanguage)) {
    return false;
  }

  return true;
}

/**
 * Repo 配列のバリデーション
 */
export function validateRepos(data: unknown): Repo[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid data: expected an array of repositories");
  }

  const invalidRepos: number[] = [];
  const validRepos: Repo[] = [];

  data.forEach((item, index) => {
    if (isRepo(item)) {
      validRepos.push(item);
    } else {
      invalidRepos.push(index);
    }
  });

  if (invalidRepos.length > 0) {
    console.warn(
      `Found ${invalidRepos.length} invalid repositories at indices: ${invalidRepos.join(", ")}`
    );
  }

  if (validRepos.length === 0) {
    console.warn("Repository validation returned an empty result set.");
  }

  return validRepos;
}

/**
 * エラーオブジェクトを安全にメッセージに変換
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}
