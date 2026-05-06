import { useCallback, useEffect, useState } from 'react';
import type { RepoUserMeta } from '../types';
import {
  createDefaultRepositoryMeta,
  getRepositoryMetaMap,
  saveRepositoryMetaMap,
} from '../storage/repositoryMetaStorage';

type RepositoryMetaPatch = Partial<Pick<RepoUserMeta, 'status' | 'purpose' | 'nextAction' | 'note'>>;

interface UseRepositoryMetaReturn {
  metaByRepoId: Record<string, RepoUserMeta>;
  saveError: string | null;
  getMeta: (repoId: string) => RepoUserMeta | null;
  updateMeta: (repoId: string, patch: RepositoryMetaPatch) => RepoUserMeta;
}

export function useRepositoryMeta(accountId: string): UseRepositoryMetaReturn {
  if (!accountId) {
    throw new Error('accountId is required to use useRepositoryMeta.');
  }

  const [metaByRepoId, setMetaByRepoId] = useState<Record<string, RepoUserMeta>>(() =>
    getRepositoryMetaMap(accountId)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setMetaByRepoId(getRepositoryMetaMap(accountId));
    setSaveError(null);
  }, [accountId]);

  const getMeta = useCallback(
    (repoId: string) => metaByRepoId[repoId] ?? null,
    [metaByRepoId]
  );

  const updateMeta = useCallback(
    (repoId: string, patch: RepositoryMetaPatch) => {
      const now = new Date().toISOString();
      const currentMap = getRepositoryMetaMap(accountId);
      const current = currentMap[repoId] ?? createDefaultRepositoryMeta(repoId, now);
      const next: RepoUserMeta = {
        repoId,
        status: patch.status ?? current.status,
        purpose: patch.purpose ?? current.purpose,
        nextAction: patch.nextAction ?? current.nextAction,
        note: patch.note ?? current.note,
        createdAt: current.createdAt,
        updatedAt: now,
      };
      const nextMap = {
        ...currentMap,
        [repoId]: next,
      };

      const saved = saveRepositoryMetaMap(accountId, nextMap);
      if (!saved) {
        setSaveError('自分用メモを保存できませんでした。ブラウザの保存領域を確認してください。');
        return current;
      }

      setSaveError(null);
      setMetaByRepoId(nextMap);
      return next;
    },
    [accountId]
  );

  return {
    metaByRepoId,
    saveError,
    getMeta,
    updateMeta,
  };
}
