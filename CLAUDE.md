# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevBoard MVP - A Kanban-style dashboard for visualizing and organizing repositories. Displays repositories in 4 columns (Active/Stale/Dormant/Archived) based on last push date, with search, sorting, and saved view functionality.

**Target Platform**: Web (React + TypeScript + Cloudflare Pages)

## Core Data Model

```typescript
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
```

## Repository Classification Logic

Repositories are classified into columns using the following rules:

```text
if isArchived → Archived
else if daysSince(pushedAt) ≤ 60 → Active
else if daysSince(pushedAt) ≤ 180 → Stale
else → Dormant
```

Thresholds (60/180 days) should be configurable with these as defaults.

## Architecture Guidelines

### Data Fetching
- Use Octokit (GraphQL preferred) to fetch repositories
- Required fields: `id`, `nameWithOwner`, `htmlUrl`, `pushedAt`, `isArchived`, `isPrivate`, `description`, `primaryLanguage`, `topics`
- Initial implementation can use mock data; prepare for Octokit integration
- Cache data locally (memory or SQLite)

### Authentication
- Use OAuth Device Flow or GitHub App
- For development, Personal Access Token with mocks is acceptable
- Plan for API rate limiting with caching layer

### UI Implementation
- Main component: `RepoBoard`
- Use `useMemo` for search/sort/classification operations
- Top bar includes:
  - Text search box (searches name/topics/description/primaryLanguage)
  - Saved view selector (max 5 saved views)
  - Sort selector (Last Updated / Name)
- 4 columns displaying classified repositories
- Cards show: title (owner/name), last update (relative time), primary language, topics (max 3), public/private badge
- Cards link to GitHub repository (new tab for web, default browser for desktop)

### Saved Views
- Store search query and sort order
- Schema: `{ id, name, searchQuery, sortOrder, createdAt }`
- Max 5 saved views
- Storage: `localStorage` (web) or `tauri-plugin-store` (desktop)

### Search and Filtering
- Case-insensitive partial match on:
  - `nameWithOwner`
  - `primaryLanguage`
  - `description`
  - `topics` (joined array)
- Sort options:
  - Last Updated: `pushedAt` descending
  - Name: `nameWithOwner` ascending (locale compare)

## Key Utilities to Implement

1. `classifyRepo(repo: Repo): ColumnKey` - Classify repository based on push date
2. `timeAgo(date: string): string` - Convert date to relative time display (e.g., "3d ago")
3. Search/filter helpers with case-insensitive comparison

## MVP Completion Criteria

- Display repositories in 4 columns according to classification rules
- Search and sort functionality works correctly from top bar
- Clicking cards opens GitHub repository page
- At least 1 saved view can be persisted and restored with search/sort state

## Out of Scope for MVP

- Drag and drop between columns
- Bulk operations
- CI status or Issue/PR information
- Advanced management features

## Task Management

When completing tasks during implementation:

1. **Update execution_plan.md**: Mark completed tasks with `[x]` in the appropriate phase section
2. **Add phase completion marker**: When all tasks in a phase are done, add "✅ 完了" to the phase header
3. **Example format**:
   ```markdown
   ### フェーズ 0: 環境準備 (0.5h) ✅ 完了
   - [x] (単純) Node.js / npm のバージョン確認とログ取得。
   - [x] (単純) プロジェクト雛形の初期化（Tauri or Next.js）とリポジトリ設定。
   ```

This helps track progress and provides visibility into what has been completed.
