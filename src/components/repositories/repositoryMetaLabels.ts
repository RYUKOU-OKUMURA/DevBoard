import type { RepoUserStatus } from '../../types';

export const REPOSITORY_USER_STATUS_OPTIONS: Array<{ value: RepoUserStatus; label: string }> = [
  { value: 'unreviewed', label: '未整理' },
  { value: 'learning', label: '確認中' },
  { value: 'in_progress', label: '進行中' },
  { value: 'paused', label: '保留' },
  { value: 'done', label: '完了' },
];

export function getRepositoryUserStatusLabel(status: RepoUserStatus): string {
  return REPOSITORY_USER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? '未整理';
}
