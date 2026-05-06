export type RepoUserStatus = 'unreviewed' | 'learning' | 'in_progress' | 'paused' | 'done';

export type RepoAutoHealth = 'Active' | 'Stale' | 'Dormant' | 'Archived';

export interface RepoUserMeta {
  repoId: string;
  status: RepoUserStatus;
  purpose: string;
  nextAction: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
