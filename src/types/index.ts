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
};

export type ColumnKey = "Active" | "Stale" | "Dormant" | "Archived";

export type SavedView = {
  id: string;
  name: string;
  searchQuery: string;
  sortOrder: SortOrder;
  createdAt: string;
};

export type SortOrder = "lastUpdated" | "name";

export type AppConfig = {
  activeThreshold: number; // days
  staleThreshold: number; // days
  maxSavedViews: number;
};
