import type { RepoProjectStage, RepoScheduleBucket, RepoUserStatus } from '../../types';

export const REPOSITORY_USER_STATUS_OPTIONS = [
  { value: 'unreviewed', label: '未整理' },
  { value: 'learning', label: '確認中' },
  { value: 'in_progress', label: '進行中' },
  { value: 'paused', label: '保留' },
  { value: 'done', label: '完了' },
] satisfies Array<{
  value: RepoUserStatus;
  label: string;
}>;

export const REPOSITORY_PROJECT_STAGE_OPTIONS = [
  { value: 'unassigned', label: '未設定' },
  { value: 'idea', label: 'アイデア' },
  { value: 'planning', label: '設計' },
  { value: 'implementation', label: '実装' },
  { value: 'testing', label: 'テスト' },
  { value: 'released', label: '公開済み' },
  { value: 'maintenance', label: '保守' },
] satisfies Array<{
  value: RepoProjectStage;
  label: string;
}>;

export const REPOSITORY_SCHEDULE_BUCKET_OPTIONS = [
  { value: 'this_week', label: '今週' },
  { value: 'next_week', label: '来週' },
  { value: 'this_month', label: '今月中' },
  { value: 'next_month', label: '来月' },
  { value: 'later', label: 'それ以降' },
  { value: 'unscheduled', label: '未定' },
] satisfies Array<{
  value: RepoScheduleBucket;
  label: string;
}>;

export function getRepositoryUserStatusLabel(status: RepoUserStatus): string {
  return REPOSITORY_USER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? '未整理';
}

export function getRepositoryProjectStageLabel(stage: RepoProjectStage): string {
  return REPOSITORY_PROJECT_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? '未設定';
}

export function getRepositoryScheduleBucketLabel(bucket: RepoScheduleBucket): string {
  return REPOSITORY_SCHEDULE_BUCKET_OPTIONS.find((option) => option.value === bucket)?.label ?? '未定';
}
