/**
 * GitHub Issues synchronization logic
 */

import { createGraphQLClient } from '../api/octokit';
import { GraphQLOperations } from '../api/githubQueryIds';
import type {
  Todo,
  GitHubIssue,
  TodoStatus,
  SyncConflict,
  SyncResult,
} from '../types';
import {
  getTodos,
  getTodoById,
  updateTodo,
  createTodo,
} from './todoStorage';

/**
 * Parse repository nameWithOwner into owner and name
 */
function parseRepoName(nameWithOwner: string): { owner: string; name: string } {
  const [owner, name] = nameWithOwner.split('/');
  return { owner, name };
}

const MAX_ISSUE_PAGES = 3;
const MAX_ISSUE_COUNT = 300;

/**
 * Fetch issues from GitHub for a repository
 */
export async function fetchIssuesFromGitHub(
  repoNameWithOwner: string
): Promise<{ issues: GitHubIssue[]; truncated: boolean }> {
  const graphql = createGraphQLClient('/github/graphql');
  const { owner, name } = parseRepoName(repoNameWithOwner);

  const allIssues: GitHubIssue[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let page = 0;
  let truncated = false;

  while (hasNextPage) {
    if (page >= MAX_ISSUE_PAGES || allIssues.length >= MAX_ISSUE_COUNT) {
      truncated = true;
      break;
    }

    const result = await graphql<{
      repository: {
        issues: {
          nodes: GitHubIssue[];
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string;
          };
        };
      };
    }>(GraphQLOperations.repositoryIssues, { owner, name, cursor });

    allIssues.push(...result.repository.issues.nodes);

    hasNextPage = result.repository.issues.pageInfo.hasNextPage;
    cursor = result.repository.issues.pageInfo.endCursor;
    page += 1;
  }

  if (truncated) {
    console.warn(
      `[issueSync] Issue fetch truncated at ${allIssues.length} items (${page} pages).`
    );
  }

  return {
    issues: allIssues.slice(0, MAX_ISSUE_COUNT),
    truncated,
  };
}

/**
 * Convert Issue state to ToDo status
 */
export function issueStateToTodoStatus(state: 'OPEN' | 'CLOSED'): TodoStatus {
  return state === 'OPEN' ? 'todo' : 'done';
}

/**
 * Convert ToDo status to Issue state
 */
export function todoStatusToIssueState(status: TodoStatus): 'OPEN' | 'CLOSED' {
  return status === 'done' ? 'CLOSED' : 'OPEN';
}

/**
 * Map GitHub Issue to ToDo data
 */
export function mapIssueToTodo(
  issue: GitHubIssue,
  repoId: string
): Omit<Todo, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: issue.title,
    description: issue.body,
    repoId,
    status: issueStateToTodoStatus(issue.state),
    priority: 'medium', // Default priority
    labels: issue.labels.map((l) => l.name),
    assignee: issue.assignees[0]?.login,
    issueNumber: issue.number,
    issueUrl: issue.url,
    syncEnabled: true,
    completedAt: issue.closedAt,
  };
}

/**
 * Import GitHub Issues as ToDos
 */
export async function importIssuesFromGitHub(
  accountId: string,
  repoId: string,
  repoNameWithOwner: string,
  issueNumbers?: number[]
): Promise<Todo[]> {
  const { issues, truncated } = await fetchIssuesFromGitHub(repoNameWithOwner);

  if (truncated) {
    console.warn(
      '[issueSync] Issue import may be incomplete due to fetch limits (max 300 issues / 3 pages).'
    );
  }

  // Filter by issue numbers if specified
  const issuesToImport = issueNumbers
    ? issues.filter((issue) => issueNumbers.includes(issue.number))
    : issues;

  // Get existing todos to avoid duplicates
  const existingTodos = getTodos(accountId);
  const existingIssueNumbers = new Set(
    existingTodos
      .filter((t) => t.repoId === repoId && t.issueNumber)
      .map((t) => t.issueNumber!)
  );

  // Import new issues
  const importedTodos: Todo[] = [];
  for (const issue of issuesToImport) {
    // Skip if already imported
    if (existingIssueNumbers.has(issue.number)) {
      continue;
    }

    const todoData = mapIssueToTodo(issue, repoId);
    const newTodo = createTodo(accountId, todoData);
    importedTodos.push(newTodo);
  }

  return importedTodos;
}

/**
 * Create GitHub Issue from ToDo
 */
export async function createIssueFromTodo(
  accountId: string,
  todo: Todo,
  repositoryId: string
): Promise<{ number: number; url: string }> {
  const graphql = createGraphQLClient('/github/graphql');

  const result = await graphql<{
    createIssue: {
      issue: {
        id: string;
        number: number;
        url: string;
      };
    };
  }>(GraphQLOperations.createIssue, {
    repositoryId,
    title: todo.title,
    body: todo.description || '',
    // Note: assigneeIds and labelIds require GitHub node IDs
    // For now, we'll skip these and add them in a future enhancement
  });

  const { number, url } = result.createIssue.issue;

  // Update the todo with issue information
  updateTodo(accountId, todo.id, {
    issueNumber: number,
    issueUrl: url,
    syncEnabled: true,
  });

  return { number, url };
}

/**
 * Update GitHub Issue from ToDo
 */
export async function updateGitHubIssue(
  issueId: string,
  todo: Todo
): Promise<void> {
  const graphql = createGraphQLClient('/github/graphql');

  await graphql(GraphQLOperations.updateIssue, {
    issueId,
    title: todo.title,
    body: todo.description || '',
    state: todoStatusToIssueState(todo.status),
  });
}

/**
 * Close GitHub Issue
 */
export async function closeGitHubIssue(issueId: string): Promise<void> {
  const graphql = createGraphQLClient('/github/graphql');

  await graphql(GraphQLOperations.closeIssue, {
    issueId,
  });
}

/**
 * Sync a single ToDo with its GitHub Issue
 */
export async function syncTodoWithIssue(
  accountId: string,
  todo: Todo,
  issue: GitHubIssue
): Promise<{ todo: Todo; conflict?: SyncConflict }> {
  if (!todo.issueNumber || !todo.syncEnabled) {
    return { todo };
  }

  // Compare timestamps to determine which is newer
  const todoUpdatedAt = new Date(todo.updatedAt);
  const issueUpdatedAt = new Date(issue.updatedAt);

  // If timestamps are very close (within 5 seconds), no sync needed
  const timeDiff = Math.abs(todoUpdatedAt.getTime() - issueUpdatedAt.getTime());
  if (timeDiff < 5000) {
    return { todo };
  }

  if (issueUpdatedAt > todoUpdatedAt) {
    // Issue is newer → Update ToDo
    const updatedTodo = updateTodo(accountId, todo.id, {
      title: issue.title,
      description: issue.body,
      status: issueStateToTodoStatus(issue.state),
      labels: issue.labels.map((l) => l.name),
      assignee: issue.assignees[0]?.login,
      completedAt: issue.closedAt,
    });

    return { todo: updatedTodo! };
  } else if (todoUpdatedAt > issueUpdatedAt) {
    // ToDo is newer → Update Issue
    await updateGitHubIssue(issue.id, todo);
    return { todo };
  }

  return { todo };
}

/**
 * Bidirectional sync between ToDos and GitHub Issues
 */
export async function syncTodosWithIssues(
  accountId: string,
  repoId: string,
  repoNameWithOwner: string
): Promise<SyncResult> {
  const result: SyncResult = {
    syncedCount: 0,
    importedCount: 0,
    exportedCount: 0,
    conflicts: [],
    errors: [],
  };

  try {
    // Fetch all issues from GitHub
    const { issues, truncated } = await fetchIssuesFromGitHub(repoNameWithOwner);

    // Get all todos for this repo
    const todos = getTodos(accountId).filter((t) => t.repoId === repoId);

    // Create maps for quick lookup
    const issueMap = new Map(issues.map((issue) => [issue.number, issue]));
    const todoMap = new Map(
      todos
        .filter((t) => t.issueNumber)
        .map((todo) => [todo.issueNumber!, todo])
    );

    // Sync existing todos with their issues
    for (const todo of todos) {
      if (!todo.issueNumber || !todo.syncEnabled) continue;

      const issue = issueMap.get(todo.issueNumber);
      if (issue) {
        const syncResult = await syncTodoWithIssue(accountId, todo, issue);
        if (syncResult.conflict) {
          result.conflicts.push(syncResult.conflict);
        }
        result.syncedCount++;
      }
    }

    // Import new issues that don't have corresponding todos
    const newIssues = issues.filter((issue) => !todoMap.has(issue.number));
    if (newIssues.length > 0) {
      const importedTodos = await importIssuesFromGitHub(
        accountId,
        repoId,
        repoNameWithOwner,
        newIssues.map((i) => i.number)
      );
      result.importedCount = importedTodos.length;
    }

    if (truncated) {
      result.errors.push(
        'Issue取得上限に達した可能性があります（最大300件 / 3ページまで取得）。'
      );
    }
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  return result;
}

/**
 * Export ToDo as GitHub Issue (for todos without issue number)
 */
export async function exportTodoAsIssue(
  accountId: string,
  todoId: string,
  repositoryId: string
): Promise<{ number: number; url: string } | null> {
  const todo = getTodoById(accountId, todoId);
  if (!todo) {
    return null;
  }

  // Don't export if already has an issue
  if (todo.issueNumber) {
    return { number: todo.issueNumber, url: todo.issueUrl! };
  }

  return await createIssueFromTodo(accountId, todo, repositoryId);
}
