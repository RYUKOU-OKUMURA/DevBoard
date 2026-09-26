import type { IssueLocalMeta } from '../../types';

export type KanbanColumn = 'todo' | 'doing' | 'done';

export function getKanbanColumn(issueState: string, meta: IssueLocalMeta | null): KanbanColumn {
  if (issueState !== 'open') return 'done';
  return meta?.inProgress ? 'doing' : 'todo';
}
