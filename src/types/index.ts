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
  // Search and sort (from SavedView)
  searchQuery: string;
  sortOrder: SortOrder;
  // Column customization
  columnTitles: Record<ColumnKey, string>;
  columnOrder: Record<ColumnKey, string[]>; // Drag-and-drop order
  columnVisibility: Record<ColumnKey, boolean>; // Show/hide columns
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

// Category Profile Types
export type CategoryFilterType = 'tag' | 'language' | 'name' | 'threshold' | 'archived' | 'custom';

export type CategoryFilter =
  | { type: 'tag'; tags: string[] }
  | { type: 'language'; languages: string[] }
  | { type: 'name'; patterns: string[] }
  | { type: 'threshold'; activeThreshold: number; staleThreshold: number }
  | { type: 'archived' }
  | { type: 'custom'; repoIds: string[] };

export type CustomCategory = {
  key: string;
  title: string;
  color?: string;
  filter: CategoryFilter;
};

export type CategoryProfile = {
  id: string;
  name: string;
  categories: CustomCategory[];
  createdAt: string;
  isDefault?: boolean;
};
