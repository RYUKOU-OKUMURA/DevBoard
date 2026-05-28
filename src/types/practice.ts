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
