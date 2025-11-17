/**
 * ToDo data types for DevBoard ToDo-Issue integration
 */

/**
 * ToDo status
 */
export type TodoStatus = 'todo' | 'in_progress' | 'done';

/**
 * ToDo priority
 */
export type TodoPriority = 'high' | 'medium' | 'low';

/**
 * ToDo item
 */
export type Todo = {
  id: string;                    // UUID
  title: string;                 // Title
  description?: string;          // Description (Markdown supported)
  repoId: string;                // Related repository ID
  status: TodoStatus;            // Status
  priority: TodoPriority;        // Priority
  dueDate?: string;              // Due date (ISO 8601)
  assignee?: string;             // Assignee (GitHub username)
  labels: string[];              // Labels
  issueNumber?: number;          // Linked Issue number
  issueUrl?: string;             // Issue URL
  syncEnabled: boolean;          // Issue sync enabled/disabled
  createdAt: string;             // Created date/time
  updatedAt: string;             // Updated date/time
  completedAt?: string;          // Completed date/time
};

/**
 * ToDo group (by repository)
 */
export type TodoGroup = {
  repoId: string;
  repoName: string;
  todos: Todo[];
  totalCount: number;
  doneCount: number;
};

/**
 * ToDo statistics
 */
export type TodoStats = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;              // Overdue
  dueToday: number;             // Due today
  dueThisWeek: number;          // Due this week
};

/**
 * Issue sync configuration
 */
export type IssueSyncConfig = {
  enabled: boolean;              // Sync enabled/disabled
  autoImport: boolean;           // Auto-import new Issues
  autoClose: boolean;            // Auto-close Issue when ToDo is completed
  syncInterval: number;          // Sync interval (minutes)
  lastSyncAt?: string;           // Last sync date/time
};

/**
 * ToDo filter
 */
export type TodoFilter = {
  status?: TodoStatus[];         // Status filter
  priority?: TodoPriority[];     // Priority filter
  repoIds?: string[];            // Repository filter
  assignee?: string;             // Assignee filter
  labels?: string[];             // Label filter
  dueDateRange?: {               // Due date range
    start?: string;
    end?: string;
  };
  searchQuery?: string;          // Search query
};

/**
 * ToDo sort
 */
export type TodoSort =
  | 'priority'                   // By priority
  | 'dueDate'                    // By due date
  | 'createdAt'                  // By created date
  | 'updatedAt'                  // By updated date
  | 'title';                     // By title

/**
 * GitHub Issue data (for sync)
 */
export type GitHubIssue = {
  id: string;
  number: number;
  title: string;
  body?: string;
  state: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  url: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
};

/**
 * Sync conflict resolution
 */
export type SyncConflict = {
  todo: Todo;
  issue: GitHubIssue;
  conflictType: 'both_updated' | 'todo_deleted' | 'issue_deleted';
};

/**
 * Sync result
 */
export type SyncResult = {
  syncedCount: number;
  importedCount: number;
  exportedCount: number;
  conflicts: SyncConflict[];
  errors: string[];
};
