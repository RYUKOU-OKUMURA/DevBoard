export type PracticeSyncStatus = 'local_only' | 'synced' | 'failed';

export interface PracticeIssueDraft {
  id: string;
  repoId: string;
  title: string;
  reason: string;
  doneCriteria: string[];
  generatedMarkdown: string;
  syncStatus: PracticeSyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PracticePullRequestDraft {
  id: string;
  repoId: string;
  title: string;
  changedItems: string[];
  reviewPoints: string[];
  relatedIssueDraftId?: string | null;
  generatedMarkdown: string;
  syncStatus: PracticeSyncStatus;
  createdAt: string;
  updatedAt: string;
}
