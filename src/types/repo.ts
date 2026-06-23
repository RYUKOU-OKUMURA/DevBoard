export type RepoUserStatus = 'unreviewed' | 'learning' | 'in_progress' | 'paused' | 'done';

export type RepoAutoHealth = 'Active' | 'Stale' | 'Dormant' | 'Archived';

export type RepoProjectStage =
  | 'unassigned'
  | 'idea'
  | 'planning'
  | 'implementation'
  | 'testing'
  | 'released'
  | 'maintenance';

export type RepoScheduleBucket =
  | 'this_week'
  | 'next_week'
  | 'this_month'
  | 'next_month'
  | 'later'
  | 'unscheduled';

export type RepositoryViewMode = 'all' | 'kanban' | 'roadmap';

export interface RepoUserMeta {
  repoId: string;
  tracked: boolean;
  status: RepoUserStatus;
  stage: RepoProjectStage;
  scheduleBucket: RepoScheduleBucket;
  purpose: string;
  nextAction: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type RepositoryMetaPatch = Partial<
  Pick<
    RepoUserMeta,
    'status' | 'tracked' | 'stage' | 'scheduleBucket' | 'purpose' | 'nextAction' | 'note'
  >
>;
