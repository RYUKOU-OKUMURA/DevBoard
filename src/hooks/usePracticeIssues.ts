import { useCallback, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import type { PracticeIssueDraft } from '../types';
import { generatePracticeIssueMarkdown } from '../lib/practiceTemplates';
import {
  createPracticeIssueDraft,
  getPracticeIssueDrafts,
  savePracticeIssueDrafts,
} from '../storage/practiceStorage';

export interface PracticeIssueDraftInput {
  title: string;
  reason: string;
  doneCriteria: string[];
}

interface UsePracticeIssuesReturn {
  drafts: PracticeIssueDraft[];
  saveError: string | null;
  getDraftsForRepo: (repoId: string) => PracticeIssueDraft[];
  createIssueDraft: (repoId: string, input: PracticeIssueDraftInput) => PracticeIssueDraft | null;
}

export function usePracticeIssues(accountId: string): UsePracticeIssuesReturn {
  if (!accountId) {
    throw new Error('accountId is required to use usePracticeIssues.');
  }

  const [drafts, setDrafts] = useState<PracticeIssueDraft[]>(() => getPracticeIssueDrafts(accountId));
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(getPracticeIssueDrafts(accountId));
    setSaveError(null);
  }, [accountId]);

  const draftsByRepoId = useMemo(
    () =>
      drafts.reduce<Record<string, PracticeIssueDraft[]>>((grouped, draft) => {
        grouped[draft.repoId] = [...(grouped[draft.repoId] ?? []), draft];
        return grouped;
      }, {}),
    [drafts]
  );

  const getDraftsForRepo = useCallback(
    (repoId: string) => draftsByRepoId[repoId] ?? [],
    [draftsByRepoId]
  );

  const createIssueDraft = useCallback(
    (repoId: string, input: PracticeIssueDraftInput) => {
      const now = new Date().toISOString();
      const currentDrafts = getPracticeIssueDrafts(accountId);
      const doneCriteria = input.doneCriteria
        .map((criterion) => criterion.trim())
        .filter((criterion) => criterion.length > 0);
      const draft = createPracticeIssueDraft({
        id: nanoid(),
        repoId,
        title: input.title.trim(),
        reason: input.reason.trim(),
        doneCriteria,
        generatedMarkdown: generatePracticeIssueMarkdown({
          title: input.title,
          reason: input.reason,
          doneCriteria,
        }),
        now,
      });
      const nextDrafts = [draft, ...currentDrafts];
      const saved = savePracticeIssueDrafts(accountId, nextDrafts);

      if (!saved) {
        setSaveError('やることカードの下書きを保存できませんでした。ブラウザの保存領域を確認してください。');
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
    createIssueDraft,
  };
}
