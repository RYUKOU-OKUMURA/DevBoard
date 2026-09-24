export type IssueLocalPriority = 'high' | 'medium' | 'low';

export type IssueLocalMeta = {
  priority?: IssueLocalPriority;
  dueDate?: string;
  note?: string;
  updatedAt: string;
};

export type IssueLocalMetaPatch = {
  priority?: IssueLocalPriority | null;
  dueDate?: string | null;
  note?: string;
};
