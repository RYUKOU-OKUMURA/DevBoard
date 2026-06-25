export type Repo = {
  id: string;
  nameWithOwner: string;
  htmlUrl: string;
  pushedAt: string;
  isArchived: boolean;
  isPrivate: boolean;
  description?: string;
  primaryLanguage?: string;
  topics: string[];
  stargazers_count?: number;
  source?: {
    type: 'viewer' | 'manual';
    addedAt?: string; // ISO date
  };
};

export type ColumnKey = string; // "Active" | "Stale" | "Dormant" | "Archived" | custom columns

export type SortOrder = "lastUpdated" | "name" | "stars" | "language";

// View modes for repository display
export type ViewMode = 'kanban' | 'grid' | 'list';

// Enhanced preset type that includes all dashboard state
export type ViewPreset = {
  id: string;
  name: string;
  // Account association for multi-account support
  accountId?: string; // GitHub user ID who owns this preset
  // Search and sort
  searchQuery: string;
  sortOrder: SortOrder;
  // Column customization
  columnTitles: Record<ColumnKey, string>;
  columnOrder: Record<ColumnKey, string[]>; // Drag-and-drop order
  columnDisplayOrder?: ColumnKey[]; // Optional for backward compatibility
  // Classification thresholds
  thresholds: {
    activeThreshold: number; // days
    staleThreshold: number; // days
  };
  // Manual column assignments
  columnAssignments: Record<string, ColumnKey>;
  // Hidden repositories
  hiddenRepoIds: string[];
  createdAt: string;
};

export type AppConfig = {
  activeThreshold: number; // days
  staleThreshold: number; // days
};

// Recent Activity Types
export type IssueState = 'OPEN' | 'CLOSED';
export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED';

export interface RecentItem {
  type: 'Issue' | 'PullRequest';
  repo: {
    nameWithOwner: string;
    htmlUrl: string;
  };
  title: string;
  number: number;
  url: string;
  occurredAt: string;
  relativeTime: string;
  // Actual state from GitHub API
  state?: IssueState | PullRequestState;
}

export type ToastVariant = 'success' | 'error';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

// 高度な機能タブ配下のサブタブ。旧カンバン、Activity、手動追加、TODO/AI をここに集約する。
// TabType は増やさず、advanced タブ内の表示用状態として扱う。
export type AdvancedSubTab = 'overview' | 'legacy' | 'activity' | 'manual' | 'todoai';

export const DEFAULT_ADVANCED_SUB_TAB: AdvancedSubTab = 'legacy';
const VALID_ADVANCED_SUB_TABS: AdvancedSubTab[] = ['overview', 'legacy', 'activity', 'manual', 'todoai'];

export function isAdvancedSubTab(value: unknown): value is AdvancedSubTab {
  return typeof value === 'string' && (VALID_ADVANCED_SUB_TABS as string[]).includes(value);
}

export * from './repo';
export * from './practice';

// Export ToDo types
export * from './todo';

// Export GitHub Actions AI integration types
export * from './githubActions';
