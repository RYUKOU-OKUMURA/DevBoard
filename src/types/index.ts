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

export type ColumnKey = "Active" | "Stale" | "Dormant" | "Archived";

export type SavedView = {
  id: string;
  name: string;
  searchQuery: string;
  sortOrder: SortOrder;
  createdAt: string;
};

export type SortOrder = "lastUpdated" | "name" | "stars" | "language";

// Enhanced preset type that includes all dashboard state
export type ViewPreset = {
  id: string;
  name: string;
  // Account association for multi-account support
  accountId?: string; // GitHub user ID who owns this preset
  // Search and sort (from SavedView)
  searchQuery: string;
  sortOrder: SortOrder;
  // Column customization
  columnTitles: Record<ColumnKey, string>;
  columnOrder: Record<ColumnKey, string[]>; // Drag-and-drop order
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
  maxSavedViews: number;
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
