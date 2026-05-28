import { useCallback, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import type { PracticeIssueDraft, PracticePullRequestDraft } from '../types';
import { generatePracticePullRequestMarkdown } from '../lib/practiceTemplates';
import {
  createPracticePullRequestDraft,
  getPracticePullRequestDrafts,
  savePracticePullRequestDrafts,
} from '../storage/practiceStorage';

export interface PracticePullRequestDraftInput {
  title: string;
  changedItems: string[];
  reviewPoints: string[];
  relatedIssueDraftId?: string | null;
}

interface UsePracticePullRequestsReturn {
  drafts: PracticePullRequestDraft[];
  saveError: string | null;
  getDraftsForRepo: (repoId: string) => PracticePullRequestDraft[];
  createPullRequestDraft: (
    repoId: string,
    input: PracticePullRequestDraftInput,
    issueDrafts?: PracticeIssueDraft[]
  ) => PracticePullRequestDraft | null;
}

function findIssueTitle(issueDrafts: PracticeIssueDraft[] | undefined, issueDraftId?: string | null): string | null {
  if (!issueDraftId) {
    return null;
  }

  return issueDrafts?.find((draft) => draft.id === issueDraftId)?.title ?? null;
}

export function usePracticePullRequests(accountId: string): UsePracticePullRequestsReturn {
  if (!accountId) {
    throw new Error('accountId is required to use usePracticePullRequests.');
  }

  const [drafts, setDrafts] = useState<PracticePullRequestDraft[]>(() => getPracticePullRequestDrafts(accountId));
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(getPracticePullRequestDrafts(accountId));
    setSaveError(null);
  }, [accountId]);

  const draftsByRepoId = useMemo(
    () =>
      drafts.reduce<Record<string, PracticePullRequestDraft[]>>((grouped, draft) => {
        grouped[draft.repoId] = [...(grouped[draft.repoId] ?? []), draft];
        return grouped;
      }, {}),
    [drafts]
  );

  const getDraftsForRepo = useCallback(
    (repoId: string) => draftsByRepoId[repoId] ?? [],
    [draftsByRepoId]
  );

  const createPullRequestDraft = useCallback(
    (repoId: string, input: PracticePullRequestDraftInput, issueDrafts?: PracticeIssueDraft[]) => {
      const now = new Date().toISOString();
      const currentDrafts = getPracticePullRequestDrafts(accountId);
      const changedItems = input.changedItems
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      const reviewPoints = input.reviewPoints
        .map((point) => point.trim())
        .filter((point) => point.length > 0);
      const relatedIssueDraftId = input.relatedIssueDraftId?.trim() || null;
      const draft = createPracticePullRequestDraft({
        id: nanoid(),
        repoId,
        title: input.title.trim(),
        changedItems,
        reviewPoints,
        relatedIssueDraftId,
        generatedMarkdown: generatePracticePullRequestMarkdown({
          title: input.title,
          changedItems,
          reviewPoints,
          relatedIssueTitle: findIssueTitle(issueDrafts, relatedIssueDraftId),
        }),
        now,
      });
      const nextDrafts = [draft, ...currentDrafts];
      const saved = savePracticePullRequestDrafts(accountId, nextDrafts);

      if (!saved) {
        setSaveError('変更の確認リクエストの下書きを保存できませんでした。ブラウザの保存領域を確認してください。');
        return null;
      }

      setSaveError(null);
      setDrafts(nextDrafts);
      return draft;
    },
    [accountId]
  );

  return {
    drafts,
    saveError,
    getDraftsForRepo,
    createPullRequestDraft,
  };
}
