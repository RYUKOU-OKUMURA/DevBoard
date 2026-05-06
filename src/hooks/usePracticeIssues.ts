import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import type { PracticeIssueDraft } from '../types';
import { createIssue } from '../api/issues';
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
  publishError: string | null;
  publishingDraftId: string | null;
  getDraftsForRepo: (repoId: string) => PracticeIssueDraft[];
  createIssueDraft: (repoId: string, input: PracticeIssueDraftInput) => PracticeIssueDraft | null;
  createGitHubIssueFromDraft: (repoNameWithOwner: string, draftId: string) => Promise<PracticeIssueDraft | null>;
}

function parseRepoNameWithOwner(nameWithOwner: string): { owner: string; repo: string } {
  const [owner, ...repoParts] = nameWithOwner.split('/');
  const repo = repoParts.join('/');

  if (!owner || !repo) {
    throw new Error('Invalid repository nameWithOwner.');
  }

  return { owner, repo };
}

function toJapaneseIssueCreationError(error: unknown): string {
  if (error instanceof Error && error.message.includes('Authentication required')) {
    return 'GitHub Issueを作成できませんでした。もう一度ログインしてから試してください。';
  }

  if (error instanceof Error && error.message.includes('403')) {
    return 'GitHub Issueを作成できませんでした。リポジトリへの書き込み権限、またはOAuth権限を確認してください。';
  }

  if (error instanceof Error && error.message.includes('404')) {
    return 'GitHub Issueを作成できませんでした。対象リポジトリが見つからないか、アクセス権がありません。';
  }

  return 'GitHub Issueを作成できませんでした。時間を置いてもう一度試してください。';
}

export function usePracticeIssues(accountId: string): UsePracticeIssuesReturn {
  if (!accountId) {
    throw new Error('accountId is required to use usePracticeIssues.');
  }

  const [drafts, setDrafts] = useState<PracticeIssueDraft[]>(() => getPracticeIssueDrafts(accountId));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);
  const publishingDraftIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDrafts(getPracticeIssueDrafts(accountId));
    setSaveError(null);
    setPublishError(null);
    setPublishingDraftId(null);
    publishingDraftIdsRef.current.clear();
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

  const createGitHubIssueFromDraft = useCallback(
    async (repoNameWithOwner: string, draftId: string) => {
      const currentDrafts = getPracticeIssueDrafts(accountId);
      const targetDraft = currentDrafts.find((draft) => draft.id === draftId) ?? null;

      if (!targetDraft) {
        setPublishError('GitHub Issueを作成できませんでした。対象の下書きが見つかりません。');
        return null;
      }

      if (targetDraft.syncStatus === 'synced') {
        setPublishError(null);
        return targetDraft;
      }

      if (publishingDraftIdsRef.current.has(draftId)) {
        return targetDraft;
      }

      setPublishError(null);
      setPublishingDraftId(draftId);
      publishingDraftIdsRef.current.add(draftId);

      try {
        const { owner, repo } = parseRepoNameWithOwner(repoNameWithOwner);
        const issue = await createIssue(owner, repo, {
          title: targetDraft.title || 'DevBoardで作成したやること',
          body: targetDraft.generatedMarkdown,
        });
        const now = new Date().toISOString();
        const nextDrafts = currentDrafts.map((draft) =>
          draft.id === draftId
            ? {
                ...draft,
                syncStatus: 'synced' as const,
                githubIssueNumber: issue.number,
                githubIssueUrl: issue.html_url,
                updatedAt: now,
              }
            : draft
        );
        const updatedDraft = nextDrafts.find((draft) => draft.id === draftId) ?? null;
        const saved = savePracticeIssueDrafts(accountId, nextDrafts);

        if (!saved || !updatedDraft) {
          setDrafts(nextDrafts);
          setPublishError('GitHub Issueは作成されましたが、DevBoard側に結果を保存できませんでした。GitHub上のIssueを確認してください。');
          return updatedDraft;
        }

        setDrafts(nextDrafts);
        return updatedDraft;
      } catch (error) {
        const now = new Date().toISOString();
        const nextDrafts = currentDrafts.map((draft) =>
          draft.id === draftId
            ? {
                ...draft,
                syncStatus: 'failed' as const,
                updatedAt: now,
              }
            : draft
        );

        savePracticeIssueDrafts(accountId, nextDrafts);
        setDrafts(nextDrafts);
        setPublishError(toJapaneseIssueCreationError(error));
        return null;
      } finally {
        publishingDraftIdsRef.current.delete(draftId);
        setPublishingDraftId(null);
      }
    },
    [accountId]
  );

  return {
    drafts,
    saveError,
    publishError,
    publishingDraftId,
    getDraftsForRepo,
    createIssueDraft,
    createGitHubIssueFromDraft,
  };
}
