import { getStorageItem, setStorageItem } from '../utils/storage';

const LEGACY_TODO_CONVERTED_PREFIX = 'devboard-legacy-todo-converted:';

function assertAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new Error('accountId is required to access legacy todo conversion records.');
  }
  return accountId;
}

function storageKey(accountId: string): string {
  return `${LEGACY_TODO_CONVERTED_PREFIX}${assertAccountId(accountId)}`;
}

function isTodoId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isIssueNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function normalizeLegacyTodoConversionMap(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  Object.entries(value).forEach(([todoId, issueNumber]) => {
    if (isTodoId(todoId) && isIssueNumber(issueNumber)) result[todoId] = issueNumber;
  });
  return result;
}

export function getLegacyTodoConversionMap(accountId: string): Record<string, number> {
  return normalizeLegacyTodoConversionMap(getStorageItem<unknown>(storageKey(accountId), {}));
}

export function recordLegacyTodoConversion(
  accountId: string,
  todoId: string,
  issueNumber: number
): boolean {
  if (!isTodoId(todoId) || !isIssueNumber(issueNumber)) return false;
  const map = getLegacyTodoConversionMap(accountId);
  map[todoId] = issueNumber;
  return setStorageItem(storageKey(accountId), normalizeLegacyTodoConversionMap(map));
}
