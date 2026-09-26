export type IssueLocalPriority = 'high' | 'medium' | 'low';

export type IssueLocalMeta = {
  priority?: IssueLocalPriority;
  dueDate?: string;
  note?: string;
  inProgress?: boolean;
  updatedAt: string;
};

export type IssueLocalMetaPatch = {
  priority?: IssueLocalPriority | null;
  dueDate?: string | null;
  note?: string;
  inProgress?: boolean;
};
