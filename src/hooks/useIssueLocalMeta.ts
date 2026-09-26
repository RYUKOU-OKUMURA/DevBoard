import { useCallback, useEffect, useState } from 'react';
import type { IssueLocalMeta, IssueLocalMetaPatch } from '../types';
import {
  getIssueLocalMetaMap,
  migrateLinkedIssueTodos,
  updateIssueLocalMeta,
} from '../storage/issueLocalMetaStorage';

interface IssueLocalMetaState {
  accountId: string;
  metaByIssueKey: Record<string, IssueLocalMeta>;
  saveError: string | null;
}

function loadAccount(accountId: string): IssueLocalMetaState {
  const migrated = migrateLinkedIssueTodos(accountId);
  return {
    accountId,
    metaByIssueKey: getIssueLocalMetaMap(accountId),
    saveError: migrated ? null : '自分用メモを保存できませんでした。ブラウザの保存領域を確認してください。',
  };
}

export function useIssueLocalMeta(accountId: string) {
  if (!accountId) throw new Error('accountId is required to use useIssueLocalMeta.');

  const [state, setState] = useState<IssueLocalMetaState>(() => loadAccount(accountId));

  useEffect(() => {
    if (state.accountId !== accountId) setState(loadAccount(accountId));
  }, [accountId, state.accountId]);

  const getMeta = useCallback((repoId: string, issueNumber: number) => {
    if (state.accountId !== accountId) return null;
    return state.metaByIssueKey[`${repoId}#${issueNumber}`] ?? null;
  }, [accountId, state]);

  const updateMeta = useCallback((repoId: string, issueNumber: number, patch: IssueLocalMetaPatch) => {
    const saved = updateIssueLocalMeta(accountId, repoId, issueNumber, patch);
    if (!saved) {
      setState((current) => ({ ...current, saveError: '自分用メモを保存できませんでした。ブラウザの保存領域を確認してください。' }));
      return false;
    }
    setState({ accountId, metaByIssueKey: getIssueLocalMetaMap(accountId), saveError: null });
    return true;
  }, [accountId]);

  const reloadMeta = useCallback(() => {
    setState((current) => ({ ...current, accountId, metaByIssueKey: getIssueLocalMetaMap(accountId) }));
  }, [accountId]);

  return { metaAccountId: state.accountId, saveError: state.saveError, getMeta, updateMeta, reloadMeta };
}
